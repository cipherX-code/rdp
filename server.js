const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();

app.use(express.json());
app.use(cors());

let shell;
let queue = [];
let current = null;
let stdoutBuffer = "";
let stderrBuffer = "";

function startShell() {
    shell = spawn("bash", [], {
        cwd: process.cwd(),
        env: process.env
    });

    shell.stdout.setEncoding("utf8");
    shell.stderr.setEncoding("utf8");

    shell.stdout.on("data", (data) => {
        if (!current) return;
        
        stdoutBuffer += data;
        
        const markerRegex = new RegExp(current.marker + " (\\d+)\\n");
        const match = stdoutBuffer.match(markerRegex);

        if (match) {
            const exitCode = parseInt(match[1]);
            const index = match.index;
            
            const stdoutPart = stdoutBuffer.substring(0, index).replace(/\r/g, "").trim();
            const stderrPart = stderrBuffer.trim();

            let combinedOutput = stdoutPart;
            if (stderrPart) {
                combinedOutput += (combinedOutput ? "\n" : "") + stderrPart;
            }

            let combinedError = stderrPart;
            if (stdoutPart) {
                combinedError += (combinedError ? "\n" : "") + stdoutPart;
            }

            current.resolve({
                success: exitCode === 0,
                output: combinedOutput,
                error: exitCode === 0 ? undefined : (combinedError || "Command failed with exit code " + exitCode)
            });

            stdoutBuffer = "";
            stderrBuffer = "";
            current = null;
            processQueue();
        }
    });

    shell.stderr.on("data", (data) => {
        if (!current) return;
        stderrBuffer += data;
    });

    shell.on("exit", () => {
        console.log("Shell exited, restarting...");
        startShell();
    });
}

function processQueue() {
    if (current) return;
    if (queue.length === 0) return;

    current = queue.shift();
    const marker = current.marker;

    shell.stdin.write(current.command + "\n");
    shell.stdin.write(`echo ${marker} $?\n`);
}

function execute(command) {
    return new Promise((resolve) => {
        if (!command.trim()) {
            resolve({ success: true, output: "" });
            return;
        }

        queue.push({
            command,
            marker: "__DONE__" + Date.now(),
            resolve
        });

        processQueue();
    });
}

startShell();

app.get("/", (req, res) => {
    res.send("Backend Running");
});

app.post("/execute", async (req, res) => {
    console.log("Received:", req.body);
    try {
        const result = await execute(req.body.command);
        res.json(result);
    } catch (e) {
        res.json({
            success: false,
            error: e.message
        });
    }
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
