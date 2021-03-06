const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const joi = require('joi');
const { campgroundSchema, reviewSchema } = require('./schemas.js');
const methodOverride = require('method-override');
const Campground = require('./models/campground');
const Review = require('./models/review');

mongoose.connect('mongodb://localhost:27017/yelp-camp', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!")
    })
    .catch(err => {
        console.log("OH NO MONGO CONNECTION ERROR!!!!")
        console.log(err)
    })



const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended:true }));  // important for post request
app.use(methodOverride('_method'));


// writing middleware function for joi

const validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}
app.get('/', (req,res)=>{
    res.render('home');
})

app.get('/campgrounds', async (req, res)=>{
    
        const campgrounds = await Campground.find({});
        res.render('campgrounds/index', { campgrounds })
   
    
});

app.get('/campgrounds/new', (req, res) => {
    res.render('campgrounds/new');
})

// app.post('/campgrounds', async(req, res, next) => {
//     try {
//         const campground = new Campground(req.body.campground);
//         await campground.save();
//         res.redirect(`/campgrounds/${campground._id}`)
//     } catch (e) {
//         next(e)
//     }
// })

// app.post('/campgrounds', catchAsync(async(req, res, next) => {
//         if(!req.body.campground) throw new ExpressError('invalid campground data', 400);
//         const campground = new Campground(req.body.campground);
//         await campground.save();
//         res.redirect(`/campgrounds/${campground._id}`)
    
// }))

app.post('/campgrounds', validateCampground ,catchAsync(async(req, res, next) => {
        // if(!req.body.campground) throw new ExpressError('invalid campground data', 400);
        

        
        const campground = new Campground(req.body.campground);
        await campground.save();
        res.redirect(`/campgrounds/${campground._id}`)
    
}))

app.get('/campgrounds/:id', async (req,res) => {
    const campground = await Campground.findById(req.params.id).populate('reviews')
    res.render('campgrounds/show', { campground });
})

app.get('/campgrounds/:id/edit', async(req, res) => {
    const campground = await Campground.findById(req.params.id)
    res.render('campgrounds/edit', { campground });
})

app.put('/campgrounds/:id', validateCampground ,catchAsync(async(req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    res.redirect(`/campgrounds/${campground._id}`)
    // res.send("it worked")
}))

app.delete('/campgrounds/:id', catchAsync(async(req, res) => {
    const {id} = req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect('/campgrounds');
}));


app.post('/campgrounds/:id/reviews', validateReview, catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    const review = new Review(req.body.review);
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`);
    // res.send('YOU made it')
}))

app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req,res) => {
       const { id, reviewId } = req.params;
       await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
       await Review.findByIdAndDelete(reviewId);
       res.redirect(`/campgrounds/${id}`);
    // res.send("delete pressed");
}))

// app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res) => {
//     const { id, reviewId } = req.params;
//     await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
//     await Review.findByIdAndDelete(reviewId);
//     res.redirect(`/campgrounds/${id}`);
// }))

app.all('*', (req,res, next) => {
    next(new ExpressError('Page Not Found', 404));
    res.send("404!!");
})

app.use((err, req, res, next) => {
    const { statusCode = 500} = err;
    if(!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err });
    // res.send('Oh boy, something went wrong!!');
})

app.listen(5000, ()=>{
    console.log('Serving on port 5000');
})