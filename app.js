require('dotenv').config();

const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // call as uuidv4() to generate unique path
const PORT = process.env.PORT;
const ngrok = require('ngrok');
const pool = new Pool();

app.set("views", "./views");
app.set("view engine", "pug");

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())

mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true })
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to MongoDB'));
let url;

(async function() {
  url = await ngrok.connect();
  console.log(url)
})()


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

app.get("/", async (req, res) => {
  res.render('homepage', {
    currentPage: req.get('host'),
    url
  })
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

        res.render("bin", {
          documents,
          endpoint: req.params.id
        })

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
    // res.send(endpoint);
    res.render("endpoint", {
      endpoint: `${url}/${endpoint}`
    })
    })
  } catch (error) {
      console.log(error);
  }
});

app.post("/:id", (req, res) => {
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