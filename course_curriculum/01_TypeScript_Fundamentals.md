# Course 01: TypeScript Fundamentals

If you're going to build the Dining Room (React Frontend), you need entirely reliable building materials. 

In the old days, we used **JavaScript**. JavaScript was notoriously reckless. You could try to do math by adding a word and a number together (`"Apple" + 5`), and instead of stopping you, it would just print `"Apple5"`, potentially crashing your app hours later in front of a customer!

Enter **TypeScript**. TypeScript is JavaScript strapped with a strict security guard. It forces you to declare **exactly what type of data** you are working with.

## 1. Variables: The Concept of Specific Boxes
Imagine you are moving houses. You have boxes. In JavaScript, you can put soup in a cardboard box, and a pair of scissors in a plastic bag. Disaster.
In TypeScript, you label your boxes so strictly that the computer physically stops you from putting soup in the electronics box.

```typescript
// 'let' means the box can be opened and the contents changed later.
// ': string' is the strict label. Only words go in here.
let username: string = "Qassim"; 

// The computer will scream ERROR if you try this:
// username = 500;  <- ERROR: Type 'number' is not assignable to type 'string'.
```

```typescript
// 'const' means the box is glued shut. The value cannot change.
const birthYear: number = 1995;
// birthYear = 1996; <- ERROR: Cannot reassign a constant.
```

## 2. Functions: The Meat Grinder Model
Think of a function as an industrial meat grinder. It has a hole at the top (Inputs/Parameters), blades inside (Logic), and a spout at the bottom (Output/Return).

TypeScript forces you to label the Input Hole and the Output Spout to ensure nobody throws a wrench into your meat grinder.

```typescript
// Input hole expects two numbers. Output spout promises a number.
function calculateTax(amount: number, taxRate: number): number {
    const finalAmount = amount * taxRate;
    return finalAmount;
}

// SUCCESS:
const total = calculateTax(100, 1.15);

// TypeScript ERROR! You tried to pass a word ("High") into a number hole!
// calculateTax(100, "High"); 
```

## 3. Interfaces: The VIP Club Dress Code
Often, you deal with complex data, like a "User". A user isn't just one word; it's a collection of properties.
An **Interface** is the strict dress code for an object. It says, "If you want to be considered a User in my nightclub, you MUST have an ID, an Email, and optionally a Phone Number."

```typescript
// Defining the Dress Code
interface UserProfile {
    id: number;
    email: string;
    isAdmin: boolean;
    phone?: string; // The "?" means this is OPTIONAL.
}

// Creating an object following the Dress Code
const myUser: UserProfile = {
    id: 1,
    email: "test@example.com",
    isAdmin: true
    // Note: phone is missing, but that is perfectly fine because of the "?"
};

// ERROR! You missed the 'email' property, you are not allowed in the club!
/*
const badUser: UserProfile = {
    id: 2,
    isAdmin: false
};
*/
```

### Summary
TypeScript is essentially a built-in spelling and grammar checker for code. By forcing you to declare your variables, label your function grinders, and strictly enforce the shape of your data with Interfaces, TypeScript prevents 90% of bugs before you even click "Save". 

In TambuaTips, look at `src/types.ts`. You will see massive Interfaces controlling exactly what a `Tip` or a `Jackpot` must look like.
