# Course 02: React & Component Thinking

Welcome to React, the engine powering your Frontend.

## 1. Components: The Lego Block Philosophy
Before React, building a website was like carving a solid statue out of one massive block of marble. If you wanted to change the statue's thumb, you risked cracking the whole arm.

React introduced **Components**, which is like building out of Lego blocks.
Look at Facebook. You see a "Like" button. That button is an independent Lego block. It has its own code, its own styling, and its own rules. 
The developers just snapped thousands of `LikeButton` Lego blocks onto the page. If the code for the `LikeButton` ever breaks, ONLY the Like Button disappears; the rest of the news feed stays perfectly intact.

```tsx
// A simple React Lego Block
export function FancyButton() {
    return (
        <button className="bg-green-500 text-white rounded">
            Click Me!
        </button>
    );
}
```

## 2. Props: The Downward Waterfall
Imagine a factory boss on the top floor dropping instruction notes down a pipe to a worker on the floor below. 
In React, "Props" (Properties) are how parent Lego blocks pass instructions down to child Lego blocks.

```tsx
// The child block. It waits for instructions via the 'props' object.
function GreetingCard(props: { name: string }) {
    return <h1>Hello, {props.name}!</h1>;
}

// The parent block using the child block, and passing down the specific instruction.
export function App() {
    return (
        <div>
            <GreetingCard name="Qassim" />
            <GreetingCard name="Sarah" />
        </div>
    );
}
```

## 3. State (useState): The Short-Term Memory
Components are inherently forgetful. If you click a button, the default React button forgets you clicked it 1 millisecond later.
`useState` is giving your Lego block a whiteboard to write notes on. It's the component's internal short-term memory.

```tsx
import { useState } from 'react';

export function LightSwitch() {
    // 1. The memory: Is it on? (Default false)
    // 2. The magic marker: setLightOn (The only tool allowed to alter the whiteboard)
    const [lightOn, setLightOn] = useState(false);

    return (
        <div>
            <p>The room is: {lightOn ? "Bright" : "Dark"}</p>
            
            {/* When clicked, use the marker to flip the memory */}
            <button onClick={() => setLightOn(!lightOn)}>
                Toggle Switch
            </button>
        </div>
    );
}
```
**CRITICAL RULE OF REACT:** When a component's `State` changes (the whiteboard is rewritten), React instantly freaks out and redraws everything on your screen to reflect the new memory!

## 4. Effect (useEffect): The Security Camera
Sometimes, your Lego block needs to do something the exact moment it enters the screen, or when something specific changes.
`useEffect` is a security camera that watches the component and triggers side-effects.

**Analogy:** "As soon as I open the door (component loads), trigger the side-effect of turning on the porch light (fetching data from the backend)."

```tsx
import { useState, useEffect } from 'react';

export function TipList() {
    const [tips, setTips] = useState([]);

    // The Effect: Trigger this code exactly ONCE when the component first appears.
    useEffect(() => {
        console.log("Component appeared! Let's fetch the tips from the kitchen!");
        // We'll learn how to fetch data in the next chapter.
    }, []); // The empty brackets [] mean "Only do this once".

    return <div>We have {tips.length} tips.</div>;
}
```

### Summary
In TambuaTips (`src/components/`), you will see dozens of independent Lego blocks. They pass data downward through **Props**, remember what the user is typing via **State**, and run network requests when they first load on screen via **Effect**.
