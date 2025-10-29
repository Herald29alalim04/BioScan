// Code by Herald Vann D. Alalim
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import "./App.css";

function App() {
  const [mode, setMode] = useState("menu");
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [detections, setDetections] = useState([]);
  const [facingMode, setFacingMode] = useState("environment"); // ✅ Added: default to back camera

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // Roboflow API details
  const API_URL = "https://serverless.roboflow.com/biomedical_waste-8wf50/8";
  const API_KEY = "4LC1ABjAXTxUte6rnOCB";

  // Bin mapping
  const BIN_MAP = {
    BLOOD: "🟡 Yellow Bin → Infectious and pathological waste",
    "Contaminated Plastic": "🔴 Red Bin → Contaminated plastic waste",
    Glass: "🔵 Blue Bin → Uncontaminated or disinfected glassware, bottles, vials",
    "Sharp Object": "⚪ White Bin → Sharps (syringes, needles, scalpels, blades)",
  };

  const formatResult = (data) => {
    if (!data.predictions || data.predictions.length === 0) {
      return "No biomedical waste detected.";
    }

    return data.predictions
      .map((pred, i) => {
        const label = pred.class;
        const confidence = (pred.confidence * 100).toFixed(2);
        const binInfo = BIN_MAP[label] || "Unknown waste type";
        return `Detection ${i + 1}:
Class: ${label}
Confidence: ${confidence}%
Bin: ${binInfo}\n`;
      })
      .join("\n");
  };

  const drawBoxes = (predictions, img) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = img.width;
    canvas.height = img.height;

    predictions.forEach((pred) => {
      const { x, y, width, height, class: label, confidence } = pred;
      ctx.beginPath();
      ctx.strokeStyle = "#FF3D00";
      ctx.lineWidth = 3;
      ctx.rect(x - width / 2, y - height / 2, width, height);
      ctx.stroke();

      ctx.fillStyle = "#FF3D00";
      ctx.font = "16px Poppins";
      ctx.fillText(
        `${label} (${(confidence * 100).toFixed(1)}%)`,
        x - width / 2,
        y - height / 2 - 5
      );
    });
  };

  useEffect(() => {
    if (image && detections.length > 0) {
      const imgElement = document.getElementById("uploaded-image");
      if (imgElement.complete) {
        drawBoxes(detections, imgElement);
      } else {
        imgElement.onload = () => drawBoxes(detections, imgElement);
      }
    }
  }, [image, detections]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(null);
    setResult(null);
    setDetections([]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(",")[1];
      setImage(reader.result);
      setResult("Detecting...");

      try {
        const response = await axios({
          method: "POST",
          url: API_URL,
          params: { api_key: API_KEY },
          data: base64,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        setDetections(response.data.predictions || []);
        setResult(formatResult(response.data));
      } catch (err) {
        setResult("Error: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const captureFromWebcam = async () => {
    const screenshot = webcamRef.current.getScreenshot();
    const base64 = screenshot.split(",")[1];
    setResult("Detecting...");

    try {
      const response = await axios({
        method: "POST",
        url: API_URL,
        params: { api_key: API_KEY },
        data: base64,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      setResult(formatResult(response.data));
    } catch (err) {
      setResult("Error: " + err.message);
    }
  };

  // ✅ Added: toggle front/back camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className="app-container">
      {mode === "menu" && (
        <div className="card">
          <img src="/Images/2.svg" alt="BioScan Logo" className="logo" />
          <h1 className="title">BioScan</h1>
          <p className="subtitle">Choose a mode to start detection</p>
          <div className="button-group">
            <button className="btn upload" onClick={() => setMode("upload")}>
              Upload
            </button>
            <button className="btn realtime" onClick={() => setMode("realtime")}>
              Realtime
            </button>
          </div>
        </div>
      )}

      {mode === "upload" && (
        <div className="card">
          <h2 className="title">Upload your image here!</h2>
          <div className="button-group">
            <label className="btn upload file-btn">
              Choose File
              <input type="file" accept="image/*" onChange={handleImageUpload} />
            </label>
            <button className="btn back" onClick={() => setMode("menu")}>
              Back
            </button>
          </div>

          <div className="image-container">
            {image && (
              <>
                <img id="uploaded-image" src={image} alt="Uploaded" className="preview" />
                <canvas ref={canvasRef} className="overlay"></canvas>
              </>
            )}
          </div>

          {result && <pre className="result-box">{result}</pre>}
        </div>
      )}

      {mode === "realtime" && (
        <div className="card">
          <h2 className="title">Realtime Detection</h2>

          {/* ✅ Camera with facingMode support */}
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="webcam"
            videoConstraints={{ facingMode }}
          />

          <div className="button-group">
            <button className="btn upload" onClick={captureFromWebcam}>
              Capture & Detect
            </button>

            {/* ✅ Toggle front/back camera button */}
            <button className="btn rotate" onClick={toggleCamera}>
              {facingMode === "user" ? "Switch to Back Camera" : "Switch to Front Camera"}
            </button>

            <button className="btn back" onClick={() => setMode("menu")}>
              Back
            </button>
          </div>

          {result && <pre className="result-box">{result}</pre>}
        </div>
      )}
    </div>
  );
}

export default App;
/* Code by Herald Vann D. Alalim */
