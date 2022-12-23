const express = require('express')
const strftime = require("strftime")
const moment = require("moment");
const app = express()
const cors = require('cors')
const mongo = require("mongodb")
const mongoose = require("mongoose")
// const MUUID = require('uuid-mongodb');

require('dotenv').config()
const mySecret = process.env.MONGO_URI
// const mUUID4 = MUUID.v4();
// mUUID4.toString()



// middleware
app.use(cors())
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({
  extended:false
}))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//database connection
mongoose.connect(process.env.MONGO_URI,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useFindAndModify: false 
})

//Model Schema

const exerciseSchema  =  new mongoose.Schema({
   
  userId: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now()
    }
})

const Exercises = mongoose.model("Exercises",exerciseSchema)

const userSchema = new mongoose.Schema({
   username: {
     type: String,
     required: true
   }
 })

const User = mongoose.model("User",userSchema)
// create a new user.
app.post("/api/users",(request,response)=>{
  const {username} = request.body
  // console.log(username)
  User.findOne({username:username})
  .then(user=>{
    if (user) throw new Error('username already taken');
        return User.create({ username })
  }).then(data=>{
    response.json({
      username:data.username,
      _id: data._id
    })
  }).catch(error=>{
    console.log(error)
  })
})

//get all users
app.get("/api/users",(request,response,next)=>{
  User.find({},"username")
  .then(userdata =>response.json(userdata))
  .catch(error=>next(error))
})

// You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used

app.post('/api/users/:_id/exercises',(request,response)=>{
    let {description,duration,date} = request.body
    let userId= request.params._id
    // let newdate = new Date(date).toDateString() | Date.now()
  //find user amd create and exercises instances 
  User.findById({_id:userId})
  .then(user=>{
    if(!user) throw new Error("Unknown user")
      date = date || Date.now();
    return Exercises.create({
      userId,description,duration,date
    })
    .then(data=>{
      response.json(
        {
        username: user.username,
        description: data.description,
        duration: data.duration,
        date:new Date(data.date).toDateString(),
        _id: data.userId
      }
      )
    })
  }).catch(error=>{
    console.log(error)
  })
  // console.log("_id: ",_id)
})


app.get("/api/users/:_id/logs",(request,response)=>{
  let userId= request.params._id
  let _id  = userId;
  const {from,to,limit} = request.params
  // console.log("from:",from)
    from = moment(from, 'YYYY-MM-DD').isValid() ? moment(from, 'YYYY-MM-DD') : 0;
    to = moment(to, 'YYYY-MM-DD').isValid() ? moment(to, 'YYYY-MM-DD') : moment().add(1000000000000);
    User.findById(_id).then(user => {
      if (!user) throw new Error('Unknown user with _id');
      // console.log(user)
      Exercises.find({userId})
        .where('date').gte(from).lte(to)
        .limit(+limit).exec()
      .then(log=>response.json({
        username: user.username,
        _id: userId,
        count: log.length,
        log: log.map(item=>({
          description: item.description,
          duration: item.duration,
          date: new Date(item.date).toDateString()
        }))
      }))
    }).catch(err => {
            console.log(err);
          response.status(500).send(err.message);
        })
  
})
app.get("/api/hello",(request,response)=>{
  response.send("Have you done the exercise?")
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
