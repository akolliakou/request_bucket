require('dotenv').config();

const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT;
const ngrok = require('ngrok');
const pool = new Pool();
const Request = require('./models/request')

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

(async function () {
  url = await ngrok.connect();
  console.log(url)
})();

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

        documents = documents.map((doc, idx) => {
          doc['requestNumber'] = idx + 1
          return doc;
        })

        res.json(documents);
      }
    });
  } catch (error) {
    console.log(error);
  }
});

app.post("/create-bin", (req, res) => {
  const endpoint = uuidv4();
  try {
    pool.connect(async (error, client, release) => {
      await client.query(`INSERT INTO bin (binURL) VALUES ('${endpoint}')`);
      release();
      res.render("endpoint", {
        endpoint: `${url}/${endpoint}`
      });
    });
  } catch (error) {
      console.log(error);
  }
});

app.post("/:id", (req, res) => {
  try {
    pool.connect(async (error, client, release) => {
      let resp = await client.query(`SELECT binID FROM bin WHERE binURL = '${req.params.id}'`);
      release();
      if (resp.rows.length === 0) {
        res.sendStatus(404);
      } else {
        const requestBin = new Request({
          headers: JSON.stringify(req.headers),
          body: JSON.stringify(req.body),
          bin_id: resp.rows[0].binid
        });
        try {
          let newRequest = await requestBin.save();
          res.status(201).send(newRequest);
        } catch (error) {
          res.status(400).json({ message: error.message })
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));