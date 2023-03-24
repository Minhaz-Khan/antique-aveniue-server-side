const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.REACT_PROT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const verifyJWT = (req, res, next) => {
    const authHeaders = req.headers.authorization
    if (!authHeaders) {
        res.status(401).send('unauthorized access')
    }
    const token = authHeaders.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden' })
        }

        req.decoded = decoded;
        next()
    })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.drtwsrz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        const userCollection = client.db('antiqueAvenue').collection('users');
        const allSalePostCollection = client.db('antiqueAvenue').collection('allSalePost');
        const bookingCollection = client.db('antiqueAvenue').collection('bookings');
        const wishlistCollection = client.db('antiqueAvenue').collection('wishList');
        const paymentCollection = client.db('antiqueAvenue').collection('payments');

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email }
            const user = await userCollection.findOne(filter);
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
        app.post('/addProduct', verifyJWT, async (req, res) => {
            const product = req.body;
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const result = await allSalePostCollection.insertOne(product);
                return res.send(result)
            }
            res.status(403).send('forbidden access')
        })
        app.get('/myProduct', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            const query = { sellerEmail: email };
            if (email === decodedEmail) {
                const result = await allSalePostCollection.find(query).toArray();
                return res.send(result);
            }
            res.status(403).send('forbidden access')
        })

        app.put('/myProduct/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'advertised'
                }
            }
            const result = await allSalePostCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })


        app.get('/avertised', verifyJWT, async (req, res) => {
            const query = { status: 'advertised' }
            const result = await allSalePostCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/allseller', verifyJWT, async (req, res) => {
            const query = { userType: 'Seller' }
            const result = await userCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/allbuyer', verifyJWT, async (req, res) => {
            const query = { userType: 'Buyer' }
            const result = await userCollection.find(query).toArray();
            res.send(result)
        })

        app.delete('/delteUser/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(filter)
            res.send(result)
        })
        app.post('/booking', verifyJWT, async (req, res) => {
            const bookingInfo = req.body;
            const email = bookingInfo.buyerEmail;
            const query = { buyerEmail: email };
            const allBookings = await bookingCollection.find(query).toArray();
            const isBooked = allBookings.find(booking => booking.bookedProductId === bookingInfo.bookedProductId);

            if (isBooked) {
                return res.send({ message: 'alreay booked' })
            }
            const result = await bookingCollection.insertOne(bookingInfo);
            res.send(result)
        })
        app.delete('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result)
        })
        app.get('/mybooking', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            const query = { buyerEmail: email }
            if (email === decodedEmail) {
                const result = await bookingCollection.find(query).toArray()
                return res.send(result)
            }
            res.status(403).send('forbidden access')
        })

        app.get('/userType', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const user = await userCollection.findOne(filter);
            const userType = user.userType
            res.send({ userType })
        })
        app.post('/wishlist', verifyJWT, async (req, res) => {
            const wishlistItem = req.body;
            const result = await wishlistCollection.insertOne(wishlistItem);
            res.send(result);
        })
        app.get('/wishlist', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            const query = { buyerEmail: email }
            if (email === decodedEmail) {
                const result = await wishlistCollection.find(query).toArray()
                return res.send(result)
            }
            res.status(403).send('forbidden access')
        })
        app.delete('/wishlist/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await wishlistCollection.deleteOne(filter);
            res.send(result);
        })

        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const amount = booking.price * 100
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ],

            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })

        app.post('/payments', verifyJWT, async (req, res) => {
            const paymentInfo = req.body;
            const id = paymentInfo.bookingId;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: paymentInfo.TransactionId
                }
            }
            const result = await paymentCollection.insertOne(paymentInfo);
            const updateBookings = await bookingCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.post('/wishlistpayments', verifyJWT, async (req, res) => {
            const paymentInfo = req.body;
            const id = paymentInfo.bookingId;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: paymentInfo.TransactionId
                }
            }
            const result = await paymentCollection.insertOne(paymentInfo);
            const updateWishlist = await wishlistCollection.updateOne(filter, updateDoc)
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