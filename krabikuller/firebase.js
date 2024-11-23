//import { getDatabase, ref, set, get, child, push } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { getDatabase} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPPfEB46a1d_gxWknguGbbiGNNODjflhA",
  authDomain: "krabikuller.firebaseapp.com",
  databaseURL: "https://krabikuller-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "krabikuller",
  storageBucket: "krabikuller.firebasestorage.app",
  messagingSenderId: "124331997863",
  appId: "1:124331997863:web:1a025488223010e08ef982",
  measurementId: "G-MT2PJRBTRZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(firebaseConfig);
export {database}