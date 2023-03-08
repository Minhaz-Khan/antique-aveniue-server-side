const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.REACT_PROT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors())
app.use(express.json())
require('dotenv').config()

const verifyJWT = (req, res, next) => {
    const authHeaders = req.headers.authorization
    if (!authHeaders) {
        res.status(401).send('unauthorized access')
    }
    const token = authHeaders.split(' ')[1];
    console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden' })
        }
        res.decoded = decoded;
        next()
    })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.drtwsrz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        const userCollection = client.db('antiqueAvenue').collection('users');
        const allSalePostCollection = client.db('antiqueAvenue').collection('allSalePost')
        const bookingCollection = client.db('antiqueAvenue').collection('bookings')

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email }
            const user = await userCollection.findOne(filter);
            console.log(user);
            if (!user) {

                return res.status(403).send({ accessToken: '' })
            }
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1 days' });
            res.send({ accessToken: token })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const isOldUser = await userCollection.findOne(filter);
            if (!isOldUser) {
                const result = await userCollection.insertOne(user);
                return res.send(result)
            }
            res.send({ oldUser: true })


        })
        app.get('/allSalePost', verifyJWT, async (req, res) => {
            const categorie = req.query.categorie;
            const query = { categories: categorie };
            const allPost = allSalePostCollection.find(query);
            const result = await allPost.toArray();
            res.send(result)
        })
        app.post('/booking', verifyJWT, async (req, res) => {
            const bookingInfo = req.body;
            const email = bookingInfo.buyerEmail;
            const filter = { buyerEmail: email };
            const allBookings = await bookingCollection.find().toArray();
            const isBooked = allBookings.map(booking => booking.bookedProductId === bookingInfo.bookedProductId);
            if (isBooked) {
                return res.send({ message: 'alreay booked' })
            }
            const result = await bookingCollection.insertOne(bookingInfo);
            res.send(result)
        })
        app.get('/mybooking', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            const query = { buyerEmail: email }
            if (email === decodedEmail) {
                const result = await bookingCollection.find(query).toArray()
                return res.send(result)
            }
            res.status(403).send('forbidden access')
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