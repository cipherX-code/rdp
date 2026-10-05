const express = require("express");
const cors = require("cors");

const { exec } = require("child_process");

const app = express();

app.use(express.json());
app.use(cors());

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

app.get("/", (req, res) => {
    res.send("Backend Running");
});

app.post("/execute", (req, res) => {
    console.log(req.body);

    const command = req.body.command;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            res.json({
                suceess: false,
                error: stderr.toString()

            });
        }
        else {
            res.json({
                success: true,
                output: stdout.toString()
            })
        }
    });
    // res.json({
    //     success: true
    // });
})
