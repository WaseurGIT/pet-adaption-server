const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.febqytm.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("petAdoption").collection("users");
    const petsCollection = client.db("petAdoption").collection("pets");
    const reviewsCollection = client.db("petAdoption").collection("reviews");
    const adoptionsCollection = client
      .db("petAdoption")
      .collection("adoptions");
    const donationsCollection = client
      .db("petAdoption")
      .collection("donations");

    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized access" });
      }

      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.secretKey, (err, decoded) => {
        if (err) {
          return res.status(403).json({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    app.post("/jwt", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.secretKey, { expiresIn: "7d" });
      res.send({ token });
    });

    // user related api
    // 1. add a new user to the database
    app.post("/users", verifyToken, async (req, res) => {
      try {
        const user = req.body;

        if (!user.name || !user.email) {
          return res
            .status(400)
            .json({ success: false, error: "Name and email are required" });
        }

        const existingUser = await usersCollection.findOne({
          email: user.email,
        });
        if (!existingUser) {
          const result = await usersCollection.insertOne(user);
          return res
            .status(200)
            .json({ success: true, message: "User added", result });
        } else {
          return res.status(200).json({
            success: true,
            message: "User already exists",
            existingUser,
          });
        }
      } catch (error) {
        console.error("Error", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 2. get all users from the database
    app.get("/users", verifyToken, async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error getting all users:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 3. get single users or a specific user by email
    app.get("/users/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email: email });

        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        } else {
          res.status(200).json({ success: true, data: user });
        }
      } catch (error) {
        console.error("Error getting single user:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 4. delete a user from the database
    app.delete("/users/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // pets related api
    // 1. add a new pet to the database
    app.post("/pets", verifyToken, async (req, res) => {
      try {
        const pet = req.body;

        if (!pet.pet_name || !pet.category || !pet.age) {
          return res.status(400).json({
            success: false,
            message: "Name, type and age are required for a pet",
          });
        }

        const result = await petsCollection.insertOne(pet);
        res.status(201).json({
          success: true,
          message: "Pet added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 2. get all pets from the database, with optional filtering by category
    app.get("/pets", async (req, res) => {
      try {
        const { category } = req.query;
        let query = {};

        if (category) {
          query.category = category;
        }

        const result = await petsCollection.find(query).toArray();
        res.json({
          success: true,
          count: result.length,
          data: result,
        });
      } catch (error) {
        console.error("Error getting pets:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 3. get a single pet by id
    app.get("/pets/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid pet ID format",
          });
        }

        const result = await petsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!result) {
          return res.status(404).json({
            success: false,
            message: "Pet not found",
          });
        }

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 4.delete a pet from the database
    app.delete("/pets/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid pet ID",
          });
        }
        const query = { _id: new ObjectId(id) };
        const result = await petsCollection.deleteOne(query);
        if (result.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Pet not found",
          });
        }
        res.json({
          success: true,
          message: "Pet deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting pet:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // adoption related api
    // 1. post an adoption request
    app.post("/adoptions", verifyToken, async (req, res) => {
      try {
        const adoption = req.body;
        if (!adoption.email || !adoption.petId) {
          return res.status(400).json({
            success: false,
            message:
              "User email and pet ID are required for an adoption request",
          });
        }
        const result = await adoptionsCollection.insertOne(adoption);
        res.status(201).json({
          success: true,
          message: "Adoption request submitted successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error submitting adoption request:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // 2. get all adoption requests
    app.get("/adoptions", verifyToken, async (req, res) => {
      try {
        const result = await adoptionsCollection.find().toArray();
        res.json({
          success: true,
          count: result.length,
          data: result,
        });
      } catch (error) {
        console.error("Error getting adoption requests:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // reviews related api
    // 1. add a new review to the database
    app.post("/reviews", verifyToken, async (req, res) => {
      try {
        const review = req.body;
        if (!review.email || !review.rating) {
          return res.status(400).json({
            success: false,
            message: "User email and rating are required for a review",
          });
        }
        const result = await reviewsCollection.insertOne(review);
        res.status(201).json({
          success: true,
          message: "Review added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // 2. get all reviews
    app.get("/reviews", verifyToken, async (req, res) => {
      try {
        const result = await reviewsCollection.find().toArray();
        res.json({
          success: true,
          count: result.length,
          data: result,
        });
      } catch (error) {
        console.error("Error getting reviews:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // donations related api
    // 1. add a new donation to the database
    app.post("/donations", verifyToken, async (req, res) => {
      try {
        const donation = req.body;
        if (!donation.email || !donation.amount) {
          return res.status(400).json({
            success: false,
            message: "User email and donation amount are required",
          });
        }
        const result = await donationsCollection.insertOne(donation);
        res.status(201).json({
          success: true,
          message: "Donation added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding donation:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // 2. get all donations
    app.get("/donations", verifyToken, async (req, res) => {
      try {
        const result = await donationsCollection.find().toArray();
        res.json({
          success: true,
          count: result.length,
          data: result,
        });
      } catch (error) {
        console.error("Error getting donations:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`Pet Adoption Server is running on port ${port}`);
});

app.listen(port, () => {
  console.log(`Pet Adoption Server is running on port ${port}`);
});
