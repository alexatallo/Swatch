require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const mongoUri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

const app = express();
app.use(express.json({ limit: "10mb" })); // ✅ Increased request size limit
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors()); // ✅ Enable CORS

// MongoDB Connection
const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("Swatch");
        console.log("✅ Connected to MongoDB Atlas!");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        process.exit(1); // ✅ Exit if connection fails
    }
}
connectDB();

// ✅ Signup Route
app.post("/signup", async (req, res) => {
    try {
        const { email, password, username, firstname, lastname, isBusiness } = req.body;
        if (!email || !password || !username || !firstname || !lastname) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const usersCollection = db.collection("User");
        const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.status(400).json({ error: "Email already registered." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await usersCollection.insertOne({
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            firstname,
            lastname,
            password: hashedPassword,
            isBusiness: isBusiness || false,
        });
        res.json({ message: "User registered successfully", userId: result.insertedId });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Business Signup Route
app.post("/business/signup", async (req, res) => {
    try {
        console.log("🏢 Business Signup request received:", req.body);

        const { userId, businessName, businessLocation, website } = req.body;
        if (!userId || !businessName || !businessLocation || !website) {
            return res.status(400).json({ error: "All business fields are required." });
        }

        // Log the payload for debugging
        console.log("Business Signup Payload:", { userId, businessName, businessLocation, website });

        const addressRegex = /^[0-9]+\s[A-Za-z0-9\s,.-]+$/;
        if (!addressRegex.test(businessLocation)) {
            return res.status(400).json({ error: "Invalid business address format." });
        }

        const websiteRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (!websiteRegex.test(website)) {
            return res.status(400).json({ error: "Invalid website format. Must start with http:// or https://." });
        }

        const usersCollection = db.collection("User");
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(400).json({ error: "User not found." });
        }

        // Check if the user is a business
        if (!user.isBusiness) {
            return res.status(403).json({ error: "User is not a business account." });
        }

        const businessCollection = db.collection("Business");

        console.log("✅ Inserting business into database...");
        const result = await businessCollection.insertOne({
            userId: new ObjectId(userId), // Convert userId to ObjectId here
            businessName,
            businessLocation,
            website,
            createdAt: new Date(),
        });

        if (result.acknowledged) {
            console.log(" Business inserted successfully:", result.insertedId);
            res.json({ message: "Business registered successfully", businessId: result.insertedId });
        } else {
            console.error("Failed to insert business:", result);
            res.status(500).json({ error: "Failed to insert business" });
        }

    } catch (error) {
        console.error("Error registering business:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ✅ Login Route
app.post("/login", async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;
        const usersCollection = db.collection("User");
        const user = await usersCollection.findOne({
            $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
        });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user._id, email: user.email }, jwtSecret, { expiresIn: "1h" });
        res.json({ message: "Login successful", token });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.post("/posts", async (req, res) => {
    try {
        if (!client.topology || !client.topology.isConnected()) {
            return res.status(500).json({ error: "Database not connected" });
        }

        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(403).json({ error: "No token provided" });

        const decoded = jwt.verify(token, jwtSecret);
        const { caption, nailColor, nailLocation, photoUri } = req.body;

        if (!caption || !nailColor || !nailLocation || !photoUri) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // ✅ Ensure valid image format (Base64 or URL)
        if (!photoUri.startsWith("data:image") && !photoUri.startsWith("http")) {
            return res.status(400).json({ error: "Invalid image format" });
        }

        const postsCollection = db.collection("posts");

        const newPost = {
            userId: new ObjectId(decoded.userId),
            caption,
            nailColor,
            nailLocation,
            photoUri,
            createdAt: new Date(),
        };

        const result = await postsCollection.insertOne(newPost);
        newPost._id = result.insertedId;

        res.json(newPost); // ✅ Send full post back
    } catch (error) {
        console.error("❌ Error creating post:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.get("/posts", async (req, res) => {
    console.log("✅ Endpoint /posts hit");

    try {
        console.log("✅ Headers:", req.headers);
        console.log("✅ Checking token...");

        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(" ")[1] : null;

        if (!token) {
            console.log("❌ No token received");
            return res.status(403).json({ message: "No token provided" });
        }

        console.log("✅ Token received:", token);

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("✅ Token Verified:", decoded);
        } catch (err) {
            console.error("❌ JWT Verification Failed:", err.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        console.log("✅ Connecting to database...");
        await client.connect();
        const db = client.db("Swatch");
        const postsCollection = db.collection("posts");

        console.log("✅ Fetching all posts...");
        const allPosts = await postsCollection.find().sort({ createdAt: -1 }).toArray(); // Sort by newest first

        if (!allPosts.length) {
            console.log("❌ No posts found.");
            return res.status(404).json({ message: "No posts found" });
        }

        console.log("✅ Backend Data:", allPosts.length, "entries found");
        res.json({ status: "okay", data: allPosts });

    } catch (error) {
        console.error("❌ Server Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

// UPDATE BUSINESS NAME ROUTE
app.put("/account/business", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }

        const { businessName, businessLocation, website } = req.body;
        const updateFields = {};

        // Validate input and add to updateFields only if provided
        if (businessName) updateFields.businessName = businessName;
        if (businessLocation) updateFields.businessLocation = businessLocation;
        if (website) {
            const websiteRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
            if (!websiteRegex.test(website)) {
                return res.status(400).json({ error: "Invalid website format. Must start with http:// or https://." });
            }
            updateFields.website = website;
        }

        // Ensure there is at least one field to update
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: "At least one field must be provided for update." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const usersCollection = db.collection("User");
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user is a business
        if (!user.isBusiness) {
            return res.status(403).json({ error: "User is not a business account." });
        }

        const businessCollection = db.collection("Business");
        const business = await businessCollection.findOne({ userId: new ObjectId(userId) });

        if (!business) {
            return res.status(404).json({ message: "Business not found" });
        }

        // Update business fields
        const result = await businessCollection.updateOne(
            { userId: new ObjectId(userId) },
            { $set: updateFields }
        );

        if (result.modifiedCount > 0) {
            res.json({ message: "Business information updated successfully." });
        } else {
            res.status(400).json({ message: "No changes made." });
        }
    } catch (error) {
        console.error("Error updating business information:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/account", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]; // Removes "Bearer"
        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const usersCollection = db.collection("User");
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch associated business data, if exists
        const businessCollection = db.collection("Business");
        const business = await businessCollection.findOne({ userId: new ObjectId(userId) });

        console.log("User Data:", user); // Log the user data
        console.log("Business Data:", business); // Log the business data

        // Prepare the response data
        const { password, ...userData } = user;
        const responseData = {
            user: userData,
            business: business || null // Include business data or null if no business
        };

        res.json(responseData);
    } catch (error) {
        console.error(error);

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token" });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }

        res.status(500).json({ message: "Server error" });
    }
});

app.get("/polishes", async (req, res) => {
    console.log("✅ Endpoint /polishes hit"); // Check if this logs
 
    try {
      console.log("✅ Headers:", req.headers); // Log headers to confirm request is received
      console.log("✅ Checking token...");
 
      const authHeader = req.headers.authorization;
      const token = authHeader ? authHeader.split(" ")[1] : null;
 
      if (!token) {
        console.log("❌ No token received");
        return res.status(403).json({ message: "No token provided" });
      }
 
      console.log("✅ Token received:", token);
 
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token Verified:", decoded);
      } catch (err) {
        console.error("❌ JWT Verification Failed:", err.message);
        return res.status(401).json({ message: "Invalid or expired token" });
      }
 
      console.log("✅ Connecting to database...");
      await client.connect();
      const db = client.db("Swatch");
      const polishCollection = db.collection("Polish");
 
      console.log("✅ Fetching all polishes...");
      const allPolishes = await polishCollection.find().toArray();
 
      if (!allPolishes.length) {
        console.log("❌ No polishes found.");
        return res.status(404).json({ message: "No polishes found" });
      }
 
      console.log("✅ Backend Data:", allPolishes.length, "entries found");
      res.json({ status: "okay", data: allPolishes });
 
    } catch (error) {
      console.error("❌ Server Error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

// ✅ Start Server
app.listen(5000, () => console.log("🚀 Backend API running on port 5000"));