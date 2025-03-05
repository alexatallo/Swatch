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



// ✅ Account Route
app.get("/account", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(403).json({ message: "No token provided" });
        const decoded = jwt.verify(token, jwtSecret);
        const usersCollection = db.collection("User");
        const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
        if (!user) return res.status(404).json({ message: "User not found" });
        const { password, ...userData } = user;
        res.json({ user: userData });
    } catch (error) {
        console.error("Error fetching account details:", error);
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
