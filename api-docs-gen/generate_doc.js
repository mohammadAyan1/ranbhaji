const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

const apis = [
    {
        module: "Authentication (लॉगिन और रजिस्ट्रेशन)",
        endpoints: [
            {
                name: "User Registration (नया अकाउंट बनाना)",
                method: "POST",
                url: "/api/auth/register",
                description: "Ye API naya user account banane ke liye hit karni hai. Isse user register hoga aur usko auth token (cookie me) aur user details response me milengi.",
                requestType: "JSON",
                requestBody: [
                    { field: "name", type: "String", req: "Yes", desc: "User ka pura naam" },
                    { field: "phone", type: "String", req: "Yes", desc: "User ka mobile number (10 digit)" },
                    { field: "email", type: "String", req: "No", desc: "User ka email id (optional)" },
                    { field: "password", type: "String", req: "Yes", desc: "User ka password" },
                    { field: "role", type: "String", req: "No", desc: "'user', 'delivery', ya 'admin'. Default 'user' hota hai." }
                ],
                responseDesc: "Agar registration success hua toh token aur user details aayenge.",
                responseBody: [
                    { field: "success", type: "Boolean", desc: "true agar register ho gaya" },
                    { field: "message", type: "String", desc: "Success message" },
                    { field: "token", type: "String", desc: "JWT token aage ki API hit karne ke liye" },
                    { field: "user", type: "Object", desc: "User ki details (id, name, phone, email, role)" }
                ]
            },
            {
                name: "User Login (अकाउंट में लॉगिन करना)",
                method: "POST",
                url: "/api/auth/login",
                description: "Ye API existing user ko login karne ke liye hit karni hai. Isme phone number aur password bhejte hain.",
                requestType: "JSON",
                requestBody: [
                    { field: "phone", type: "String", req: "Yes", desc: "User ka registered mobile number" },
                    { field: "password", type: "String", req: "Yes", desc: "User ka password" }
                ],
                responseDesc: "Login success hone par auth token cookie aur JSON response me milega.",
                responseBody: [
                    { field: "success", type: "Boolean", desc: "true" },
                    { field: "token", type: "String", desc: "JWT Auth Token" },
                    { field: "user", type: "Object", desc: "User details including wallet_balance aur due_amount" }
                ]
            }
        ]
    },
    {
        module: "Retail Orders (सामान की खरीददारी)",
        endpoints: [
            {
                name: "Create Retail Order (नया आर्डर प्लेस करना)",
                method: "POST",
                url: "/api/retail/orders",
                description: "Ye API tab hit hogi jab user cart se checkout karke retail order (jaise COD ya Wallet se) place karega.",
                requestType: "JSON",
                requestBody: [
                    { field: "address_id", type: "Integer", req: "Yes", desc: "Address ki ID jahan delivery karni hai" },
                    { field: "payment_method", type: "String", req: "Yes", desc: "'cod' ya 'wallet'" },
                    { field: "items", type: "Array of Objects", req: "Yes", desc: "List of items in cart" }
                ],
                itemsBody: [
                    { field: "product_id", type: "Integer", req: "Yes", desc: "Product ki ID" },
                    { field: "quantity", type: "Number", req: "Yes", desc: "Kitni quantity chahiye" }
                ],
                responseDesc: "Order successfully create hone par order ki details aayengi. Agar wallet se payment hui hai aur balance kam hai toh error aayega.",
                responseBody: [
                    { field: "success", type: "Boolean", desc: "true" },
                    { field: "message", type: "String", desc: "Success message" },
                    { field: "order", type: "Object", desc: "Create hue order ki poori details (total_amount, delivery_charge, etc.)" }
                ]
            },
            {
                name: "Get User Orders (यूजर के सभी आर्डर्स देखना)",
                method: "GET",
                url: "/api/retail/orders",
                description: "User apne pichle saare retail orders (order history) dekhne ke liye ye API hit karega.",
                requestType: "N/A (Header me Auth Token)",
                requestBody: [],
                responseDesc: "User ke sabhi orders, unka address, aur items ki details return hoti hai.",
                responseBody: [
                    { field: "success", type: "Boolean", desc: "true" },
                    { field: "orders", type: "Array", desc: "List of all orders placed by user with items and product details" }
                ]
            }
        ]
    },
    {
        module: "Wallet & Payments (वॉलेट और पेमेंट्स)",
        endpoints: [
            {
                name: "Get Wallet Balance (वॉलेट बैलेंस चेक करना)",
                method: "GET",
                url: "/api/wallet",
                description: "Ye API user ke current wallet balance aur due amount ko check karne ke liye hai.",
                requestType: "N/A (Header me Auth Token)",
                requestBody: [],
                responseDesc: "Wallet balance aur due amount return karega.",
                responseBody: [
                    { field: "success", type: "Boolean", desc: "true" },
                    { field: "wallet_balance", type: "Number", desc: "User ke wallet me bacha hua amount" },
                    { field: "due_amount", type: "Number", desc: "User ne agar udhar/credit liya hai toh uska amount" }
                ]
            },
            {
                name: "Add Funds to Wallet (वॉलेट में पैसे डालना)",
                method: "POST",
                url: "/api/wallet/add-funds",
                description: "Jab user apne wallet me paise add karta hai (jaise manual recharge ya PhonePe success ke baad), tab ye API hit hoti hai.",
                requestType: "JSON",
                requestBody: [
                    { field: "amount", type: "Number", req: "Yes", desc: "Jitna amount wallet me add karna hai" },
                    { field: "payment_method", type: "String", req: "No", desc: "Kaise add kiya gaya hai (e.g., 'upi', 'phonepe')" }
                ],
                responseDesc: "Funds add hone par updated balance return hota hai.",
                responseBody: [
                    { field: "success", type: "Boolean", desc: "true" },
                    { field: "message", type: "String", desc: "Success message" },
                    { field: "wallet_balance", type: "Number", desc: "Naya wallet balance" }
                ]
            }
        ]
    }
];

function createTable(fields) {
    if (fields.length === 0) {
        return new Paragraph("Isme koi request body nahi bhejni hai.");
    }
    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: "Field Name", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Data Type", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Required", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Description (Hinglish)", bold: true })] }),
        ],
    });

    const rows = fields.map(f => new TableRow({
        children: [
            new TableCell({ children: [new Paragraph(f.field)] }),
            new TableCell({ children: [new Paragraph(f.type)] }),
            new TableCell({ children: [new Paragraph(f.req || "-")] }),
            new TableCell({ children: [new Paragraph(f.desc)] }),
        ],
    }));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...rows],
    });
}

function createResponseTable(fields) {
    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: "Field Name", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Data Type", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Description (Hinglish)", bold: true })] }),
        ],
    });

    const rows = fields.map(f => new TableRow({
        children: [
            new TableCell({ children: [new Paragraph(f.field)] }),
            new TableCell({ children: [new Paragraph(f.type)] }),
            new TableCell({ children: [new Paragraph(f.desc)] }),
        ],
    }));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...rows],
    });
}

const docChildren = [
    new Paragraph({
        text: "Rambhaji API Integration Document",
        heading: HeadingLevel.TITLE,
        alignment: "center"
    }),
    new Paragraph({
        text: "Is document me Rambhaji application ke API integration ki saari details Hinglish me di gayi hain. Isme aapko milega ki konsa method hit karna hai, request me kya data (payload) bhejna hai, uska datatype kya hoga, aur response me kya milega.",
        spacing: { after: 400 }
    })
];

apis.forEach(mod => {
    docChildren.push(new Paragraph({
        text: mod.module,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
    }));

    mod.endpoints.forEach(ep => {
        docChildren.push(new Paragraph({
            text: `${ep.name}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
        }));
        
        docChildren.push(new Paragraph({
            children: [
                new TextRun({ text: "Method: ", bold: true }),
                new TextRun(ep.method)
            ]
        }));
        
        docChildren.push(new Paragraph({
            children: [
                new TextRun({ text: "Endpoint URL: ", bold: true }),
                new TextRun(ep.url)
            ],
            spacing: { after: 100 }
        }));
        
        docChildren.push(new Paragraph({
            children: [
                new TextRun({ text: "Kaam kya hai (Description): ", bold: true }),
                new TextRun(ep.description)
            ],
            spacing: { after: 200 }
        }));

        docChildren.push(new Paragraph({
            text: "Request Data (Aapko kya bhejna hai):",
            bold: true,
            spacing: { after: 100 }
        }));
        
        docChildren.push(createTable(ep.requestBody));

        if (ep.itemsBody) {
             docChildren.push(new Paragraph({
                text: "Agar 'items' array bhej rahe hain, toh uske andar ke objects aese honge:",
                bold: true,
                spacing: { before: 200, after: 100 }
            }));
            docChildren.push(createTable(ep.itemsBody));
        }

        docChildren.push(new Paragraph({
            text: "Response Data (Aapko return me kya milega):",
            bold: true,
            spacing: { before: 300, after: 100 }
        }));

        docChildren.push(new Paragraph({
            text: ep.responseDesc,
            spacing: { after: 100 }
        }));

        docChildren.push(createResponseTable(ep.responseBody));

        docChildren.push(new Paragraph({
            text: "------------------------------------------------------",
            spacing: { before: 300, after: 300 },
            alignment: "center"
        }));
    });
});

const doc = new Document({
    sections: [{
        properties: {},
        children: docChildren
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Rambhaji_API_Integration_Doc.docx", buffer);
    console.log("Document generated successfully!");
});
