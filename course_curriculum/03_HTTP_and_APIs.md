# Course 03: HTTP and APIs (The Postal Service)

You now know how to build the beautiful Frontend layer using React. But your Frontend is legally blind and completely isolated. It knows nothing about the user's betting tips or their Premium status. It needs to ask the Backend.

How do two computers talking to each other across the globe actually communicate?

## 1. JSON: The Esperanto of the Internet
The Frontend speaks TypeScript/React. The Backend speaks Python. 
If an Englishman and a Chinese person meet, they might choose to communicate in English as a bridge.

In code, the universal bridge language is **JSON (JavaScript Object Notation)**. It is just plain text structured cleanly.
When your React app wants to send a user to Python, it turns them into JSON text:
```json
{
  "email": "qassim@example.com",
  "age": 25,
  "isPremium": true
}
```
The Python server reads this text, perfectly understands it, does its math, and replies with more JSON text.

## 2. HTTP Methods: The Verbs of the Postal Service
When sending a letter (an HTTP Request), you have to tell the postman exactly what *Action* you want to perform. There are 4 primary verbs:

1. **GET Request:** "I want to read something." You are asking the kitchen for the menu. You aren't changing anything.
2. **POST Request:** "I want to create something completely new." E.g., Registering a brand-new user or buying a new tip.
3. **PUT Request:** "I want to change/update something that already exists." E.g., Changing your profile picture.
4. **DELETE Request:** "Destroy it." E.g., Removing your account permanently.

## 3. Axios: The Delivery Driver
React needs an engine to send these HTTP letters. We use a popular library library called **Axios**.
Think of Axios as your Uber Eats delivery driver. You hand it an address, a verb, and a package. It drives across the internet and waits for a response.

```tsx
import axios from 'axios';
import { useState, useEffect } from 'react';

export function LiveTips() {
    const [tips, setTips] = useState([]);

    // We use useEffect to trigger this delivery driver as soon as the screen loads
    useEffect(() => {
        
        async function fetchTips() {
            // 1. Send the driver out using a GET request
            const response = await axios.get("https://api.tambuatips.com/tips");
            
            // 2. The driver returns with JSON data. We save it to our State Memory!
            setTips(response.data);
        }

        fetchTips();

    }, []);

    return (
        <ul>
            {tips.map(tip => <li>{tip.teamName}</li>)}
        </ul>
    );
}
```

## 4. The Magic of "Async/Await"
Notice the words `async` and `await` above! They are incredibly important.
**Analogy:** You go to a coffee shop. You order an espresso. Does the entire store freeze in time, everyone holding their breath in paralysis, until the barista finishes making your coffee? No! The world keeps spinning while you actively wait for the cup.

In coding, sending a letter to the internet takes about 1 or 2 seconds. That is an *eternity* to a computer.
By typing `await axios.get(...)`, you are telling React: *"Go send the delivery driver. Pause this specific line of code until he returns, but let the rest of the website keep spinning so the user's screen doesn't freeze!"*

In TambuaTips, look at `src/services/`. Every file inside there is just a squad of Axios delivery drivers constantly shuttling data to the Backend.
