const SECRET = "help me";

function startListening() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.lang = "en-IN";

  recognition.onresult = (e) => {
    const text = e.results[e.results.length-1][0].transcript.toLowerCase();
    if (text.includes(SECRET)) {
    //   alert("Emergency Activated!");
    activateEmergency();
    }
  };
  recognition.start();
}
function activateEmergency(){
    document.getElementById("status").innerText = "Emergency Activated!";
    getLocation();
}
function getLocation() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // Show on screen
      document.getElementById("location").innerHTML =
        `📍 Location:<br>
         Latitude: ${lat}<br>
         Longitude: ${lon}<br>
         <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank">
           Open in Google Maps
         </a>`;

      console.log("Latitude:", lat);
      console.log("Longitude:", lon);
    },
    (error) => {
      document.getElementById("location").innerText = 
        "Location Error: " + error.message;
    },
    { enableHighAccuracy: true }
  );
}

