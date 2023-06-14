const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.frc6p9l.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db('sportsDb').collection('users')
    const classesCollection = client.db('sportsDb').collection('classes')
    const selectedCollection = client.db('sportsDb').collection('selected')
    const paymantsCollection = client.db('sportsDb').collection('payments')
    // JWT

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token })
    })

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden user' });
      }
      next();
    }
  // verify instructor

    

    // users
  
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const instructor=req.body.role;
      console.log(instructor)
      
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get('/usersInstructor', async (req, res) => {
      const filter = { role: 'instructor' }
      const result = await usersCollection.find(filter).toArray()
      res.send(result)
    })

    
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User already exist' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // admin secure

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    // admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    // instructor

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
       
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // classes

    app.get('/mangeclass', async (req, res) => { 
      const result = await classesCollection.find().sort({ available_seates: -1 }).toArray()
      res.send(result)
    })
    

    app.get('/class', async (req, res) => {
      const query = { status: 'approved' }
      const result = await classesCollection.find(query).sort({ available_seates: -1 }).toArray()
      res.send(result)
    })

    app.get('/class/:id', async (req, res) => {
      const id= req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query)
      res.send(result)
    })

    app.get('/myclass', async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await classesCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/class', async(req,res)=>{
      const newClass=req.body;
      const result = await classesCollection.insertOne(newClass)
      res.send(result)
    })

   

    app.put('/class/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true }
      const updatedClass = req.body;
      const newUpdateClass = {
        $set: {
          className: updatedClass.className,
          image: updatedClass.image,
          instructorName: updatedClass.instructorName,
          email: updatedClass.email,
          price: updatedClass.price,
          available_seates: updatedClass.available_seates,
          
        }
      };
      const result = await classesCollection.updateOne(filter, newUpdateClass, options)
      res.send(result)
    })

    app.patch('/class/approved/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'approved'
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/class/deny/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'denied'
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    
    
    // selectedcollection

    app.get('/selected', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      else {
        const query = { email: email };
        const result = await selectedCollection.find(query).toArray()
        res.send(result)
      }
    })

    app.get('/selectedById/:id', async (req, res) => {
      const id= req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedCollection.findOne(query)
      res.send(result)
    })

    app.post('/selected', async (req, res) => {
      const item = req.body;
      const result = await selectedCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/selectedDelete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await selectedCollection.deleteOne(query)
      res.send(result)
    })
// PAYMENT

    app.post('/create-payment-intent', async (req, res) => {
      const {  selectPrice  } = req.body;
      const amount = parseInt( selectPrice  * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.get('/payments', async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await paymantsCollection.find(query).sort({ date: -1 }).toArray()
      res.send(result)
    })

    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymantsCollection.insertOne(payment);

      const query = { _id:  new ObjectId(payment.cartItems) } 
      const deleteResult = await selectedCollection.deleteOne(query)

      res.send({ insertResult, deleteResult });
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('summer school is running....')
})

app.listen(port, () => {
  console.log(`summer school is running on port ${port}`)
})