const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.Db_Pass}@cluster0.tvtcgta.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // ----------------------------------------------------------------
    // --------------------DB collection---------------------------
    // ----------------------------------------------------------------

    const surveyCollection = client.db("insightNexusDB").collection("survey");

    // ----------------------------------------------------------------
    // --------------------survey related route---------------------------
    // ----------------------------------------------------------------

    app.get("/survey", async (req, res) => {
      // const cursor = surveyCollection.find();
      const result = await surveyCollection.find().toArray();
      res.send(result);
    });
    app.post("/addSurvey", async (req, res) => {
      const addNewSurvey = req.body;
      //   console.log(addNewSurvey);
      const result = await surveyCollection.insertOne(addNewSurvey);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("babu is running");
});

app.listen(port, () => {
  console.log(`Ser Ser Server is running on port: ${port}`);
});
