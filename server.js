const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use(cors());

// URI REQUIRED
const uri = "mongodb+srv://<username>:<password>@swatch.rcvjo.mongodb.net/?retryWrites=true&w=majority&appName=Swatch";
const client = new MongoClient(uri);

// Connect to Database 
async function connectDB() {
    try {
        await client.connect();
        console.log(" Connected to MongoDB Atlas!");
    } catch (error) {
        console.error(" MongoDB Connection Error:", error);
    }
}
connectDB();

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



app.post("/login", async (req, res) => {
    try {
        console.log("🔑 Login request received:", req.body);

        let { emailOrUsername, password } = req.body;
        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: "Email/Username and password are required." });
        }

      
        emailOrUsername = emailOrUsername.toLowerCase();

        const db = client.db("Swatch");
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

        const jwt = require("jsonwebtoken");

        
        const token = jwt.sign({ userId: user._id, email: user.email }, "1234", { expiresIn: "1h" });

        console.log("✅ Login successful for:", emailOrUsername);
        res.json({ message: "Login successful", token });

    } catch (error) {
        console.error("❌ Error logging in:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/business/signup", async (req, res) => {
    try {
        console.log("🏢 Business Signup request received:", req.body);

        const { userId, businessName, businessLocation, website } = req.body;
        if (!userId || !businessName || !businessLocation || !website) {
            return res.status(400).json({ error: "All business fields are required." });
        }

     
        const addressRegex = /^[0-9]+\s[A-Za-z0-9\s,.-]+$/;
        if (!addressRegex.test(businessLocation)) {
            return res.status(400).json({ error: "Invalid business address format." });
        }

   
        const websiteRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (!websiteRegex.test(website)) {
            return res.status(400).json({ error: "Invalid website format. Must start with http:// or https://." });
        }

        const db = client.db("Swatch");
        const businessCollection = db.collection("Business");

        console.log("✅ Inserting business into database...");
        const result = await businessCollection.insertOne({
            userId, 
            businessName, 
            businessLocation, 
            website,
            createdAt: new Date(),
        });

        if (result.acknowledged) {
            console.log(" Business inserted successfully:", result.insertedId);
            res.json({ message: "Business registered successfully", businessId: result.insertedId });
        } else {
            res.status(500).json({ error: "Failed to insert business" });
        }

    } catch (error) {
        console.error(" Error registering business:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



app.listen(5000, () => console.log("🚀 Backend API running on port 5000"));
