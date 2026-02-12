const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

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

    // user related api

    // 1. add a new user to the database
    app.post("/users", async (req, res) => {
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
    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error getting all users:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 3. get single users or a specific user by email
    app.get("/users/:email", async (req, res) => {
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
    app.delete("/users/:id", async (req, res) => {
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
  res.send(`Pet Adaption Server is running on port ${port}`);
});

app.listen(port, () => {
  console.log(`Pet Adaption Server is running on port ${port}`);
});
