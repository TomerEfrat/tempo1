const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Multer setup for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Append extension
    }
});
const upload = multer({ storage: storage });


// Set up mongoose connection
mongoose.connect('mongodb+srv://efratomerte:CIopxI5B5U1jQOQn@tempo1.afagtlb.mongodb.net/?retryWrites=true&w=majority&appName=tempo1', { useNewUrlParser: true, useUnifiedTopology: true });

const tagSchema = new mongoose.Schema({
    priority: String,
    employeeName: String,
    equipment: String,
    description: String,
    imageUrl: String,
    treatmentDetails: {
        employeeName: String,
        position: String,
        duration: String,
        actionsPerformed: String,
        newProcedures: String,
    },
    createdAt: { type: Date, default: Date.now },
    treatmentStartDate: Date,
    treatmentEndDate: Date,
});

const Tag = mongoose.model('Tag', tagSchema);


app.post('/update-treatment-start/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate } = req.body;
        await Tag.findByIdAndUpdate(id, { treatmentStartDate: startDate ? new Date(startDate) : null });
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.post('/update-treatment-end/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { endDate } = req.body;
        await Tag.findByIdAndUpdate(id, { treatmentEndDate: endDate ? new Date(endDate) : null });
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.get('/tags', async (req, res) => {
    try {
        const tags = await Tag.find({});
        res.render('tags', { tags });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.sendStatus(500);
    }
});

// Route to handle tag addition with image upload
app.post('/add/:priority', upload.single('image'), async (req, res) => {
    try {
        const { employeeName, equipment, description } = req.body;
        const imageUrl = req.file ? 'uploads/' + req.file.filename : null;

        const newTag = new Tag({
            employeeName,
            equipment,
            description,
            imageUrl,
            priority: req.params.priority,
        });

        await newTag.save();
        res.redirect(`/track/${req.params.priority}`); // Redirect to appropriate page after adding tag
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.get('/add/:priority', (req, res) => {
    const { priority } = req.params;
    res.render('addTag', { priority });
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/priority/:priority', (req, res) => {
    res.render('priority', { priority: req.params.priority });
});

// Route to track tags based on priority
app.get('/track/:priority', async (req, res) => {
    try {
        const tags = await Tag.find({ priority: req.params.priority });
        res.render('trackTags', { tags, priority: req.params.priority });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.sendStatus(500);
    }
});

app.get('/edit/:id', (req, res) => {
    Tag.findById(req.params.id)
        .then(tag => {
            res.render('editTag', { tag });
        })
        .catch(err => {
            console.error('Error fetching tag:', err);
            res.sendStatus(500);
        });
});


// Route to handle editing a tag

// Route to handle editing a tag
app.post('/edit/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;

        // Extract fields from req.body
        const {
            treatmentEmployeeName,
            position,
            duration,
            actionsPerformed,
            newProcedures
        } = req.body;

        // Build update object for fields that are updated
        const updateFields = {};
        if (treatmentEmployeeName) updateFields['treatmentDetails.employeeName'] = treatmentEmployeeName;
        if (position) updateFields['treatmentDetails.position'] = position;
        if (duration) updateFields['treatmentDetails.duration'] = duration;
        if (actionsPerformed) updateFields['treatmentDetails.actionsPerformed'] = actionsPerformed;
        if (newProcedures) updateFields['treatmentDetails.newProcedures'] = newProcedures;

        // Handle file upload if there's a new image
        let imageUrl = null;
        if (req.file) {
            imageUrl = 'uploads/' + req.file.filename;
            updateFields['imageUrl'] = imageUrl; // Update image URL if a new image is uploaded
        }

        // Update the document in the database
        const updatedTag = await Tag.findByIdAndUpdate(id, { $set: updateFields }, { new: true });

        // Redirect to the tracking page for the specific priority
        res.redirect(`/track/${updatedTag.priority}`); // Redirect response sent here

    } catch (error) {
        console.error('Error updating tag:', error);
        res.sendStatus(500); // Potential issue: Sending another response here
    }
});




app.post('/delete/:tagId', async (req, res) => {
    const tagId = req.params.tagId;

    try {
        await Tag.findByIdAndDelete(tagId);
        console.log('Tag deleted successfully');
        res.sendStatus(200); // Send a 200 status code to indicate success
    } catch (err) {
        console.error('Error deleting tag:', err);
        res.status(500).send('Error deleting tag');
    }
});


app.listen(3000, () => {
    console.log('Server started on port 3000');
});
