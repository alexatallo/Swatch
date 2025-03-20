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
app.use(cors());


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

            // Create an "inventory" collection for this business, also associating the userId
            const collectionsCollection = db.collection("Collection");

            console.log("📦 Creating default 'inventory' collection for the business...");
            const inventoryResult = await collectionsCollection.insertOne({
                businessId: result.insertedId, // Link to the newly created business
                userId: new ObjectId(userId), // Link to the user who owns the business
                name: "Inventory",
                createdAt: new Date(),
                polishes: [], // Start with an empty inventory
            });

            if (inventoryResult.acknowledged) {
                console.log("Inventory collection created successfully for business:", result.insertedId);
                res.json({ message: "Business registered and inventory created successfully", businessId: result.insertedId });
            } else {
                console.error("Failed to create inventory collection:", inventoryResult);
                res.status(500).json({ error: "Failed to create inventory collection" });
            }

        } else {
            console.error("Failed to insert business:", result);
            res.status(500).json({ error: "Failed to insert business" });
        }

    } catch (error) {
        console.error("Error registering business:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



app.post("/inventory", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];  // Extract Bearer token
        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);  // Verify JWT token
        } catch (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }

        const userId = decoded.userId;
        const { polishId } = req.body;
        if (!polishId) {
            return res.status(400).json({ message: "Polish ID is required." });
        }

        const collectionsCollection = db.collection("Collection");

        // Find the collection for the user where name is "Inventory"
        let inventoryCollection = await collectionsCollection.findOne({
            userId: new ObjectId(userId),
            name: "Inventory"
        });

        if (!inventoryCollection) {
            return res.status(404).json({ message: "Inventory collection not found." });
        }

        // Check if polish is already in the inventory collection
        if (inventoryCollection.polishes && inventoryCollection.polishes.includes(polishId)) {
            return res.status(400).json({ message: "Polish already in collection" });
        }

        // Add polishId to the inventory collection's polishes array
        const updateResult = await collectionsCollection.updateOne(
            { _id: inventoryCollection._id },  // Find the specific collection by _id
            { $push: { polishes: new ObjectId(polishId) } }  // Ensure polishId is an ObjectId
        );

        if (updateResult.modifiedCount > 0) {
            return res.json({ message: "Polish added to Inventory." });
        } else {
            return res.status(400).json({ message: "Failed to add polish to Inventory." });
        }

    } catch (error) {
        console.error("Error adding polish to Inventory:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

app.post("/inventory/collections", async (req, res) => {
    console.log("✅ Endpoint /inventory/collections hit");

    try {
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(" ")[1] : null;

        if (!token) {
            console.log("❌ No token received");
            return res.status(403).json({ message: "No token provided" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error("❌ JWT Verification Failed:", err.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        console.log("✅ Connecting to database...");
        await client.connect();
        const db = client.db("Swatch");
        const collectionsCollection = db.collection("Collection");

        const { collectionName, polishes } = req.body;

        if (!collectionName || !polishes || !Array.isArray(polishes)) {
            return res.status(400).json({ message: "Collection name and polishes array are required" });
        }

        console.log(`✅ Adding ${polishes.length} polishes to Inventory under '${collectionName}'`);

        // Convert polish IDs to ObjectId
        const polishObjectIds = polishes.map(id => new ObjectId(id));

        // Find or create the inventory collection
        let inventoryCollection = await collectionsCollection.findOne({
            userId: new ObjectId(decoded.userId),
            name: "Inventory"
        });

        if (!inventoryCollection) {
            console.log("✅ Creating new Inventory collection...");
            inventoryCollection = {
                userId: new ObjectId(decoded.userId),
                name: "Inventory",
                polishes: []
            };
            await collectionsCollection.insertOne(inventoryCollection);
        }

        // Add polishes to the inventory collection
        const updateResult = await collectionsCollection.updateOne(
            { _id: inventoryCollection._id },
            { $addToSet: { polishes: { $each: polishObjectIds } } } // Prevent duplicates
        );

        if (updateResult.modifiedCount > 0) {
            console.log(`✅ Successfully added ${polishObjectIds.length} polishes to Inventory`);
            return res.status(201).json({ status: "success", added: polishObjectIds.length });
        } else {
            console.log("❌ No polishes were added, possibly all were already in the Inventory");
            return res.status(400).json({ message: "No new polishes added to Inventory" });
        }
    } catch (error) {
        console.error("❌ Server Error:", error);
        return res.status(500).json({ message: "Server error" });
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

        // Validate token
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(403).json({ error: "No token provided" });

        const decoded = jwt.verify(token, jwtSecret);
        const { caption, polishId, nailLocation, photoUri } = req.body;

        // Validate required fields
        if (!caption || !polishId || !nailLocation) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        // Validate ObjectId format for polishId
        if (!ObjectId.isValid(polishId)) {
            return res.status(400).json({ error: "Invalid polishId format." });
        }

        // Fetch user details
        const usersCollection = db.collection("User");
        const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Insert new post
        const postsCollection = db.collection("posts");
        const newPost = {
            userId: new ObjectId(decoded.userId),
            username: user.username, // Include username
            caption,
            polishId: new ObjectId(polishId),
            nailLocation,
            photoUri: photoUri || null, // Allow photoUri to be optional
            createdAt: new Date(),
        };

        const result = await postsCollection.insertOne(newPost);
        newPost._id = result.insertedId;

        res.json(newPost); // Send full post back with username
    } catch (error) {
        console.error("❌ Error creating post:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});




app.get("/posts", async (req, res) => {
    try {
        console.log("✅ Incoming GET request to /posts");
        // Ensure the database is connected
        if (!client.topology || !client.topology.isConnected()) {
            return res.status(500).json({ error: "Database not connected" });
        }
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(403).json({ error: "No token provided" });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const postsCollection = db.collection("posts");
        const usersCollection = db.collection("User");
        console.log("✅ Fetching all posts...");
        const allPosts = await postsCollection.find().sort({ createdAt: -1 }).toArray();
        if (!allPosts.length) {
            console.log("❌ No posts found.");
            return res.status(404).json({ message: "No posts found" });
        }
        // ✅ Fetch user data
        const userIds = allPosts.map(post => new ObjectId(post.userId));
        const users = await usersCollection.find({ _id: { $in: userIds } }).toArray();
        const userMap = {};
        users.forEach(user => {
            userMap[user._id.toString()] = user.username;
        });
        // ✅ Attach username to posts
        const postsWithUsernames = allPosts.map(post => ({
            ...post,
            username: userMap[post.userId.toString()] || "Unknown User",
        }));
        console.log("✅ Sending posts:", postsWithUsernames.length);
        res.json({ status: "okay", data: postsWithUsernames });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


//delete a post
app.delete("/posts/:id", async (req, res) => {
    console.log("✅ Delete request received for post:", req.params.id);


    try {
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(" ")[1] : null;


        if (!token) {
            console.log("❌ No token received");
            return res.status(403).json({ message: "No token provided" });
        }


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


        const result = await postsCollection.deleteOne({ _id: new ObjectId(req.params.id) });


        if (result.deletedCount === 0) {
            console.log("❌ Post not found");
            return res.status(404).json({ message: "Post not found" });
        }


        console.log("✅ Post deleted successfully");
        res.json({ status: "okay", message: "Post deleted successfully" });


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


        // Fetch associated Swatch data
        const swatchCollection = db.collection("Collection");
        const collection = await swatchCollection.find({ userId: new ObjectId(userId) }).toArray();


        console.log("User Data:", user); // Log the user data
        console.log("Business Data:", business); // Log the business data
        console.log("Collection Data:", collection); // Log the swatch data


        // Prepare the response data
        const { password, ...userData } = user;
        const responseData = {
            user: userData,
            business: business || null, // Include business data or null if no business
            collection: collection // Include swatch data
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

        // Check for collection query parameter
        const { collection } = req.query;
        if (collection) {
            console.log("✅ Collection received:", collection);

            console.log("✅ Fetching polishes for collection:", collection);
            // Filter by collection name
            const polishesInCollection = await polishCollection.find({ collection }).toArray();

            if (polishesInCollection.length === 0) {
                console.log("❌ No polishes found for this collection");
                return res.status(404).json({ message: "No polishes found for this collection" });
            }

            console.log("✅ Backend Data:", polishesInCollection.length, "entries found");
            return res.json({ status: "okay", data: polishesInCollection });
        }

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

//orginal polish route i was scared to delete when adding stuff
app.get("/pppolishes", async (req, res) => {
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

app.get("/collections/:collectionId/polishes", async (req, res) => {
    const { collectionId } = req.params;


    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }


        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;


        // Find the collection by ID
        const collection = await db.collection("Collection").findOne({ _id: new ObjectId(collectionId) });


        if (!collection) {
            return res.status(404).json({ message: "Collection not found" });
        }


        const polishIds = collection.polishes || [];


        if (polishIds.length === 0) {
            return res.json({ status: "okay", data: [] }); // No polishes in the collection
        }


        // Convert polish IDs to ObjectIds
        const polishObjectIds = polishIds.map(id => new ObjectId(id));


        // Fetch full polish details from the Polish collection
        const polishesInCollection = await db.collection("Polish").find({ _id: { $in: polishObjectIds } }).toArray();


        res.json({
            status: "okay",
            data: polishesInCollection // Return full polish objects
        });


    } catch (error) {
        console.error("❌ Server Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


app.post("/collections/:collectionId/polishes", async (req, res) => {
    const { collectionId } = req.params;
    const { polishId } = req.body;


    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }


        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;


        // Find the collection
        const collection = await db.collection("Collection").findOne({ _id: new ObjectId(collectionId) });


        if (!collection) {
            return res.status(404).json({ message: "Collection not found" });
        }


        // Check if polish is already in the collection
        if (collection.polishes.includes(polishId)) {
            return res.status(400).json({ message: "Polish already in collection" });
        }


        // Add the polish to the collection
        await db.collection("Collection").updateOne(
            { _id: new ObjectId(collectionId) },
            { $push: { polishes: new ObjectId(polishId) } }
        );


        res.json({ message: "Polish added successfully" });


    } catch (error) {
        console.error("❌ Error adding polish:", error);
        res.status(500).json({ message: "Server error" });
    }
});




app.get("/collections", async (req, res) => {
    try {
        // Extract token from headers
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }


        // Decode the user ID from the token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        const userId = decoded.userId;


        // Fetch collections for the user
        const collectionsCollection = db.collection("Collection");
        const collections = await collectionsCollection.find({ userId: new ObjectId(userId) }).toArray();


        return res.json(collections);
    } catch (error) {
        console.error("Error fetching collections:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// ✅ Create a new collection
app.post("/collections", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(403).json({ message: "No token provided" });
        }


        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        const userId = decoded.userId;


        const { collectionName } = req.body;
        if (!collectionName) {
            return res.status(400).json({ message: "Collection name is required." });
        }


        const collectionsCollection = db.collection("Collection");


        // Check if the collection already exists for the user
        let existingCollection = await collectionsCollection.findOne({ userId: new ObjectId(userId), name: collectionName });


        if (existingCollection) {
            return res.status(400).json({ message: "Collection already exists." });
        }


        // Create a new collection
        const result = await collectionsCollection.insertOne({
            userId: new ObjectId(userId),
            name: collectionName,
            polishes: []  // Empty polish array initially
        });


        if (result.insertedId) {
            return res.json({ _id: result.insertedId, message: "Collection created successfully." });
        } else {
            return res.status(500).json({ message: "Failed to create the collection." });
        }
    } catch (error) {
        console.error("Error creating collection:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

app.listen(5000, () => console.log("🚀 Backend API running on port 5000"));
