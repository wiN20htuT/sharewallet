import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

(function () {
    const SHARED_WALLET_ID = "shared_wallet";
    const MIN_DEPOSIT_FOR_WITHDRAW = 10000;
    const NAVIGATION_DELAY_MS = 120;

    function showPageLoading(message) {
        const overlay = document.getElementById("loadingOverlay");
        if (!overlay) return;

        if (message) {
            const loadingText = overlay.querySelector(".loading-text");
            if (loadingText) loadingText.textContent = message;
        }

        overlay.style.display = "flex";
    }

    function navigateWithLoading(url, message = "Loading...") {
        showPageLoading(message);
        window.setTimeout(() => {
            window.location.href = url;
        }, NAVIGATION_DELAY_MS);
    }

    function initLoadingNavigation() {
        document.addEventListener("click", (event) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            const link = event.target.closest("a[href]");
            if (!link || link.target || link.hasAttribute("download")) return;

            const destination = new URL(link.getAttribute("href"), window.location.href);
            if (destination.origin !== window.location.origin || destination.href === window.location.href) return;

            event.preventDefault();
            navigateWithLoading(destination.href);
        });
    }

    async function requireUser(callback) {
        return onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigateWithLoading("index.html", "Opening login...");
                return;
            }

            try {
                await callback(user);
            } catch (error) {
                showAlert(error.message, "Wallet Load Failed");
            }
        });
    }

    async function isUserVerified(user) {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));
        return userSnapshot.exists() && userSnapshot.data().verified === true;
    }

    async function logout() {
        showPageLoading("Logging out...");
        try {
            await signOut(auth);
            navigateWithLoading("index.html", "Opening login...");
        } catch (error) {
            showAlert(error.message, "Logout Failed");
        }
    }

    function getDisplayName(user) {
        return (user.email || "User").split("@")[0].toUpperCase();
    }

    function getAvatarUrl(user) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(user))}&background=2563eb&color=fff`;
    }

    function formatKs(value) {
        return `${Number(value || 0).toLocaleString()} Ks`;
    }

    function formatDate(timestamp) {
        if (!timestamp) return "-";
        const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString("en-GB");
    }

    function isDeposit(transaction) {
        return transaction.type === "deposit" || transaction.type === "income";
    }

    async function getTransactions() {
        const transactionsQuery = query(
            collection(db, "transactions"),
            where("walletId", "==", SHARED_WALLET_ID)
        );
        const snapshot = await getDocs(transactionsQuery);

        return snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => getTransactionTime(b.timestamp) - getTransactionTime(a.timestamp));
    }

    function getTransactionTime(timestamp) {
        if (!timestamp) return 0;
        if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
        if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
        return new Date(timestamp).getTime();
    }

    function getSharedBalance(transactions) {
        return transactions.reduce((total, transaction) => {
            const amount = Number(transaction.amount || 0);
            return isDeposit(transaction) ? total + amount : total - amount;
        }, 0);
    }

    function getUserTransactions(transactions, user) {
        return transactions.filter((transaction) => transaction.userId === user.uid);
    }

    function getUserDepositTotal(transactions, user) {
        return getUserTransactions(transactions, user)
            .filter(isDeposit)
            .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    }

    function canUserWithdraw(transactions, user) {
        return getUserDepositTotal(transactions, user) >= MIN_DEPOSIT_FOR_WITHDRAW;
    }

    async function saveTransaction({ type, amount, description, user }) {
        const cleanDescription = description.trim();
        const cleanAmount = Number(amount);

        if (!cleanAmount || cleanAmount <= 0) {
            throw new Error("Please enter a valid amount.");
        }

        if (!cleanDescription) {
            throw new Error("Description is required.");
        }

        const transactions = await getTransactions();
        const sharedBalance = getSharedBalance(transactions);

        if (type === "withdraw") {
            if (!canUserWithdraw(transactions, user)) {
                throw new Error(`You can withdraw only after depositing ${formatKs(MIN_DEPOSIT_FOR_WITHDRAW)}.`);
            }

            if (cleanAmount > sharedBalance) {
                throw new Error(`Insufficient shared balance. Current balance is ${formatKs(sharedBalance)}.`);
            }
        }

        await addDoc(collection(db, "transactions"), {
            walletId: SHARED_WALLET_ID,
            userId: user.uid,
            userEmail: user.email,
            userName: getDisplayName(user),
            type,
            amount: cleanAmount,
            description: cleanDescription,
            note: cleanDescription,
            timestamp: new Date(),
        });
    }

    function applyTheme(theme) {
        const nextTheme = theme === "light" ? "light" : "dark";
        document.body.classList.toggle("light-mode", nextTheme === "light");
        localStorage.setItem("shareWalletTheme", nextTheme);
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.textContent = nextTheme === "light" ? "Dark Mode" : "Light Mode";
        });
    }

    function initTheme() {
        applyTheme(localStorage.getItem("shareWalletTheme") || "dark");
    }

    function toggleTheme() {
        const isLight = document.body.classList.contains("light-mode");
        applyTheme(isLight ? "dark" : "light");
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showAlert(message, title = "Wallet Notice") {
        const existingAlert = document.querySelector(".alert-overlay");
        if (existingAlert) existingAlert.remove();

        const overlay = document.createElement("div");
        overlay.className = "alert-overlay";
        overlay.innerHTML = `
            <div class="app-alert" role="alertdialog" aria-modal="true">
                <div class="alert-icon">!</div>
                <div class="alert-copy">
                    <h6>${escapeHtml(title)}</h6>
                    <p>${escapeHtml(message)}</p>
                </div>
                <button class="alert-close" type="button">OK</button>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.querySelector(".alert-close").focus();
        overlay.querySelector(".alert-close").addEventListener("click", () => overlay.remove());
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) overlay.remove();
        });
    }

    window.WalletApp = {
        SHARED_WALLET_ID,
        MIN_DEPOSIT_FOR_WITHDRAW,
        requireUser,
        logout,
        getDisplayName,
        getAvatarUrl,
        formatKs,
        formatDate,
        isDeposit,
        getTransactions,
        getSharedBalance,
        getUserTransactions,
        getUserDepositTotal,
        canUserWithdraw,
        saveTransaction,
        initTheme,
        toggleTheme,
        showAlert,
        showPageLoading,
        navigateWithLoading,
        initLoadingNavigation,
    };

    initLoadingNavigation();
})();
