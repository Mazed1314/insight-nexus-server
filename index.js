const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tvtcgta.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const userCollection = client.db("insightNexusDB").collection("allUser");
    const surveyCollection = client.db("insightNexusDB").collection("survey");
    const voteCollection = client.db("insightNexusDB").collection("vote");
    const commentCollection = client.db("insightNexusDB").collection("comment");
    const reportCollection = client.db("insightNexusDB").collection("report");

    // ----------------------------------------------------------------
    // --------------------jwt related api---------------------------
    //
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // ----------------------------------------------------------------
    // --------------------custom middlewares---------------------------
    //
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.AccessTOKEN_Secrete, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // ----------------------------------------------------------------
    // --------------------user related route---------------------------
    // ----------------------------------------------------------------

    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      // const cursor = userCollection.find();
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // ----------------------------------------------------------------
    // --------------------survey related route---------------------------
    // ----------------------------------------------------------------

    app.get("/surveys", async (req, res) => {
      // const cursor = surveyCollection.find();
      const result = await surveyCollection.find().toArray();
      res.send(result);
    });
    app.get("/surveys/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await surveyCollection.findOne(query);
      res.send(result);
    });
    app.get("/vote", async (req, res) => {
      const result = await voteCollection.find().toArray();
      res.send(result);
    });
    app.post("/vote", async (req, res) => {
      const addNewVote = req.body;
      const result = await voteCollection.insertOne(addNewVote);
      res.send(result);
    });
    app.post("/addSurvey", async (req, res) => {
      const addNewSurvey = req.body;
      //   console.log(addNewSurvey);
      const result = await surveyCollection.insertOne(addNewSurvey);
      res.send(result);
    });
    app.put("/editSurvey/:id", async (req, res) => {
      const id = req.params.id;
      const updateSurvey = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateSurvey,
      };
      const result = await surveyCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // -----------------------------------------------------------------------
    // --------------------comment related route---------------------------
    // -----------------------------------------------------------------------

    app.post("/com", async (req, res) => {
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    });

    app.get("/com/:survey_id", async (req, res) => {
      const result = await commentCollection
        .find({ survey_id: req.params.survey_id })
        .toArray();
      res.send(result);
    });
    // -----------------------------------------------------------------------
    // --------------------report related route---------------------------
    // -----------------------------------------------------------------------

    app.post("/reports", async (req, res) => {
      const getReport = req.body;
      const result = await reportCollection.insertOne(getReport);
      res.send(result);
    });

    app.get("/reports/:report_id", async (req, res) => {
      const result = await reportCollection
        .find({ report_id: req.params.report_id })
        .toArray();
      res.send(result);
    });

    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`Ser Ser Server is running on port: ${port}`);
});
