const express = require('express');
const app= express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port =process.env.PORT || 5000;

app.use(cors())
app.use(express.json())




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
    await client.connect();
    
    const usersCollection= client.db('sportsDb').collection('users')
    const classesCollection= client.db('sportsDb').collection('classes')
    const enrolledCollection= client.db('sportsDb').collection('enrolled')

   // JWT
    
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token })
    })



  // users

  app.get('/users',  async (req, res) => {
    const result = await usersCollection.find().toArray()
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
    
  // classes
    app.get('/classes', async(req,res)=>{
        
        const result= await classesCollection.find().sort({number_of_students: -1}).toArray()
        res.send(result)
    })

    // enrolledcollection

    app.get('/enrolled', async(req,res)=>{
      const email= req.query.email;
      
      if(!email){
        res.send([])
      }
      const query = {email: email};
      const result=await enrolledCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/enrolled', async(req,res)=>{
      const item =req.body;
      const result= await enrolledCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/enrolleddelete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await enrolledCollection.deleteOne(query)
      res.send(result)
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