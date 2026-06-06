# Firestore Collections

## users/{uid}

Stores the app-level user verification state.

```js
{
  uid: "firebase-auth-user-id",
  email: "user@example.com",
  verified: false,
  createdAt: Date,
  updatedAt: Date,
  verifiedAt: Date // present after OTP success
}
```

## emailOtps/{uid}

Stores the latest OTP for a user. A new resend overwrites this document.

```js
{
  uid: "firebase-auth-user-id",
  email: "user@example.com",
  otp: "123456",
  createdAt: Date,
  expiresAt: Date,
  verified: false,
  verifiedAt: Date // present after OTP success
}
```

## transactions/{autoId}

Existing wallet transaction collection.

```js
{
  walletId: "shared_wallet",
  userId: "firebase-auth-user-id",
  userEmail: "user@example.com",
  userName: "USER",
  type: "deposit",
  amount: 10000,
  description: "Deposit note",
  note: "Deposit note",
  timestamp: Date
}
```
