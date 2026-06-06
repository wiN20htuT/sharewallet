import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
apiKey: "AIzaSyAIlz-bnnSdWLx4Gw70Hdp-TSJ-adM5pis",
authDomain: "shared-wallet-59dbe.firebaseapp.com",
projectId: "shared-wallet-59dbe",
storageBucket: "shared-wallet-59dbe.firebasestorage.app",
messagingSenderId: "622209501165",
appId: "1:622209501165:web:4e59563fec3b19988a49e4",
measurementId: "G-KVVE24J892"
};

// EmailJS config
const emailJsConfig = {
publicKey: "Q0LKxCA5LGDt5jr6U",
serviceId: "service_fz8cmcn",
templateId: "template_esde7ii"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export {
app,
auth,
db,
emailJsConfig
};
