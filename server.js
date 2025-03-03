require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoUri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const client = new MongoClient(mongoUri);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("Swatch");
        console.log("✅ Connected to MongoDB Atlas!");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
    }
}
connectDB();

app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// SIGNUP ROUTE
app.post("/signup", async (req, res) => {
    try {
        console.log("Signup request received:", req.body);
        
        let { email, password, username, firstname, lastname, isBusiness } = req.body;
        if (!email || !password || !username || !firstname || !lastname) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // ✅ Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        // ✅ Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: "Password must be at least 8 characters, include one uppercase, one lowercase, one number, and one special character." });
        }

        email = email.toLowerCase();
        username = username.toLowerCase();

        const db = client.db("Swatch");
        const usersCollection = db.collection("User");

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered." });
        const existingUserName = await usersCollection.findOne({ username });
        if (existingUserName) return res.status(400).json({ error: "Username already registered." });

        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log(" Inserting user into database:", email);
        const result = await usersCollection.insertOne({
            email,
            username,
            firstname,
            lastname,
            password: hashedPassword,
            isBusiness: isBusiness || false
        });

        if (result.acknowledged) {
            console.log(" User inserted successfully:", result.insertedId);
            res.json({ message: "User registered successfully", userId: result.insertedId });
        } else {
            res.status(500).json({ error: "Failed to insert user" });
        }

    } catch (error) {
        console.error(" Error registering user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

     

// LOGIN ROUTE
app.post("/login", async (req, res) => {
    try {
        console.log("Login request received:", req.body);

        let { emailOrUsername, password } = req.body;
        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: "Email/Username and password are required." });
        }

        emailOrUsername = emailOrUsername.toLowerCase();

        const usersCollection = db.collection("User");

        const user = await usersCollection.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
        });

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        console.log("Login successful for:", emailOrUsername);
        res.json({ message: "Login successful", token });

    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ACCOUNT ROUTE (GET user data)
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

// UPDATE BUSINESS NAME ROUTE
app.put("/account/business", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }

        const { businessName } = req.body;
        if (!businessName) {
            return res.status(400).json({ message: "Business name is required." });
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

        // Update the business name in the business collection
        const result = await businessCollection.updateOne(
            { userId: new ObjectId(userId) },
            { $set: { businessName } }
        );

        if (result.modifiedCount > 0) {
            res.json({ message: "Business name updated successfully." });
        } else {
            res.status(400).json({ message: "No changes made to business name." });
        }
    } catch (error) {
        console.error("Error updating business name:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.get("/polishes", async (req, res) => {
    try {
        await client.connect();
        const db = client.db("Swatch"); 

        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(" ")[1] : null;

        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const polishCollection = db.collection("Polish");
        const firstPolish = await polishCollection.findOne({});

        if (!firstPolish) {
            return res.json({ brand: null });
        }

        res.json({ brand: firstPolish.brand });
    } catch (error) {
        console.error(error);

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token" });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }

        res.status(500).json({ message: "Server error" });
    } finally {
        await client.close();
    }
});

// Start server
app.listen(5000, () => console.log("🚀 Backend API running on port 5000"));