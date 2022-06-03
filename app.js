require('dotenv').config();

const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // call as uuidv4() to generate unique path
const PORT = process.env.PORT;

const pool = new Pool();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())

mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true })
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to MongoDB'));


const requestBinSchema = new mongoose.Schema({
  headers: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  bin_id: {
    type: Number,
    required: true
  }
})

const Request = mongoose.model('requests', requestBinSchema)

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html")
});

app.get("/:id", (req, res) => {
  try {
    pool.connect(async (error, client, release) => {
      let resp = await client.query(`SELECT * FROM bin WHERE binURL = '${req.params.id}'`);
      release();
      if (resp.rows.length === 0) {
        res.redirect('/');
      } else {
        let binID = resp.rows[0].binid;
        let documents = await Request.find({ bin_id: binID })
        console.log(documents);
        res.send(documents);
      }
    })
  } catch (error) {
    console.log(error);
  }
})

app.post("/create-bin", (req, res) => {
  const endpoint = uuidv4();
  try {
    pool.connect(async (error, client, release) => {
    await client.query(`INSERT INTO bin (binURL) VALUES ('${endpoint}')`);
    release();
    res.send(endpoint);
    })
  } catch (error) {
      console.log(error);
  }
});

app.post("/:id", (req, res) => {
  console.log(req.headers)
  console.log(req.body)

  try {
    pool.connect(async (error, client, release) => {
      let resp = await client.query(`SELECT binID FROM bin WHERE binURL = '${req.params.id}'`);
      release();
      if (resp.rows.length === 0)  {
        res.sendStatus(404);
      } else {
        const requestBin = new Request({
          headers: JSON.stringify(req.headers),
          body: JSON.stringify(req.body),
          bin_id: resp.rows[0].binid
        })

        try {
          let newRequest = await requestBin.save();
          res.status(201).send(newRequest);
        } catch (error) {
          res.status(400).json({ message: error.message })
        }
      }
    });
  } catch(error) {
    console.log(error);
  }
})


app.listen(PORT, () => console.log(`Listening on ${PORT}`));