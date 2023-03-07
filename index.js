const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.REACT_PROT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors())
app.use(express.json())
require('dotenv').config()

app.post('/jwt', (req, res) => {
    const user = req.body;
    console.log(user);
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1 days' });
    res.send({ token })
})

// user = antiqueAvenue
// password = rEVCo8hGblSIxGSu


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.drtwsrz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        const userCollection = client.db('antiqueAvenue').collection('users');
        const allSalePostCollection = client.db('antiqueAvenue').collection('allSalePost')

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result)
        })
        app.get('/allSalePost', async (req, res) => {
            const categorie = req.query.categorie;
            console.log(categorie);
            const query = { categories: categorie };
            const allPost = allSalePostCollection.find(query);
            const result = await allPost.toArray();
            res.send(result)
        })
    }
    catch { }
}
run().catch(e => console.log(e))


app.get('/', (req, res) => {
    res.send('antique avienue server is running');
})

app.listen(port, () => {
    console.log(`server running is on port ${port}`);
})