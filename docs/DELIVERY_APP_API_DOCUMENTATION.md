# 🚚 RamBhaji Delivery Partner App - API Documentation
**Complete Backend Integration Guide for Frontend / React Native Developers**

---

## 📌 1. Overview & General Architecture

Yeh document RamBhaji Delivery Partner Mobile Application (React Native / Expo / Android / iOS) ke frontend developers ke liye banaya gaya hai.

### 🌐 Base URLs
- **Production Server:** `https://backend.rambhaji.com`
- **Local Development Server:** `http://localhost:5000` (ya `http://YOUR_LOCAL_IP:5000` for physical devices)

### 🔐 Authentication & Headers
Sabhi protected endpoints ke liye `Bearer` JWT token bhejna zaroori hai:
```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

- JSON endpoints ke liye: `Content-Type: application/json`
- Photo/Multipart upload endpoints ke liye: `Content-Type: multipart/form-data` (React Native me `fetch` ya `axios` use karte waqt manual `Content-Type` header mat set karna, browser/client boundary automatically set karta hai).

---

## 📋 2. Summary of Delivery App APIs

| # | Endpoint | Method | Content-Type | Role | Purpose |
|---|----------|--------|--------------|------|---------|
| 1 | `/api/auth/login` | `POST` | `application/json` | Public | Delivery Boy Login (returns JWT Token) |
| 2 | `/api/delivery-dashboard` (or `/api/boy-dashboard`) | `GET` | - | `delivery` | **Core Dashboard**: Summary counts (Assigned, Delivered, Pending, Returned) + Categorized details |
| 3 | `/api/today-deliveries` | `GET` | - | `delivery` | Active assigned deliveries grouped by customer with GPS coordinates & items |
| 4 | `/api/mark-delivered` | `POST` | `multipart/form-data` | `delivery` | Mark order delivered with Photo, Remark, and Device GPS (Lat & Lng) |
| 5 | `/api/boy-return-order` | `POST` | `multipart/form-data` | `delivery` | Return complete order (**Before OR After** delivery) with Photo & Reason |
| 6 | `/api/boy-return-item` | `POST` | `multipart/form-data` | `delivery` | Return specific item (**Before OR After** delivery) with Photo & Return Qty |
| 7 | `/api/boy-returns` | `GET` | - | `delivery` | Returns list & history filtered by date/status |
| 8 | `/api/boy-history` | `GET` | - | `delivery` | Past delivery history with date filters |

---

## 🔑 3. Authentication: Delivery Boy Login

### `POST /api/auth/login`
Delivery boy ko app me login karne ke liye yeh API call karein.

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Payload:
```json
{
  "phone": "9589231664",
  "password": "your_secure_password"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIs...",
  "user": {
    "id": 12,
    "name": "Ramesh Delivery Boy",
    "phone": "9589231664",
    "role": "delivery",
    "status": "active"
  }
}
```

---

## 📊 4. Delivery Dashboard: Counts & Categorized Details

### `GET /api/delivery-dashboard` (also `/api/boy-dashboard`)
Yeh delivery app ki **main home screen API** hai. Isme ek single call se sabhi counts aur categories mil jaati hain.

#### Query Parameters (Optional):
| Param | Type | Description |
|---|---|---|
| `date` | String | `YYYY-MM-DD` format (defaults to current date in IST). |

#### Request Example:
```http
GET /api/delivery-dashboard?date=2026-11-26
Authorization: Bearer <token>
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "date": "2026-11-26",
  "summary": {
    "total_assigned": 15,
    "pending_deliveries_count": 6,
    "delivered_count": 7,
    "returned_orders_count": 2,
    "returned_items_count": 3
  },
  "deliveries": {
    "pending": [
      {
        "id": 108,
        "delivery_id": 108,
        "type": "package",
        "status": "ready_for_delivery",
        "delivery_date": "2026-11-26",
        "time_slot": "05:00 PM - 07:00 PM",
        "customer": {
          "id": 45,
          "name": "Mr. Rahul Sharma",
          "phone": "9826012345",
          "address": "Flat 204, Green Heights, Arera Colony, Bhopal - 462016",
          "landmark": "Near SBI ATM",
          "city": "Bhopal",
          "pincode": "462016",
          "latitude": 23.259933,
          "longitude": 77.412615
        },
        "order_details": {
          "package_name": "SARAN JI NANO",
          "total_items": 4,
          "items": [
            {
              "delivery_item_id": 412,
              "product_id": 5,
              "product_name": "Potato",
              "hindi_name": "आलू",
              "qty": 500,
              "unit": "gm",
              "image_url": "https://backend.rambhaji.com/uploads/potato.jpg",
              "return_status": "none",
              "return_qty": null,
              "return_reason": null
            },
            {
              "delivery_item_id": 413,
              "product_id": 8,
              "product_name": "Tomato",
              "hindi_name": "टमाटर",
              "qty": 500,
              "unit": "gm",
              "image_url": "https://backend.rambhaji.com/uploads/tomato.jpg",
              "return_status": "none",
              "return_qty": null,
              "return_reason": null
            }
          ]
        }
      }
    ],
    "delivered": [
      {
        "id": 105,
        "delivery_id": 105,
        "type": "package",
        "status": "delivered",
        "delivery_date": "2026-11-26",
        "actual_delivery_date": "2026-11-26",
        "delivered_at": "2026-11-26T14:32:10.000Z",
        "time_slot": "05:00 PM - 07:00 PM",
        "delivery_photo_url": "/uploads/delivery_proof_1781677681968.png",
        "delivery_remark": "Delivered to security guard",
        "delivery_latitude": 23.259850,
        "delivery_longitude": 77.412580,
        "customer": {
          "id": 39,
          "name": "Neha Shastri",
          "phone": "9826123456",
          "address": "E-4, Trilanga, Bhopal - 462039",
          "landmark": "Opposite Park",
          "city": "Bhopal",
          "pincode": "462039",
          "latitude": 23.210400,
          "longitude": 77.432100
        },
        "order_details": {
          "package_name": "NEHA SHASTRI JI",
          "total_items": 3,
          "items": [...]
        }
      }
    ],
    "returned": [
      {
        "id": 98,
        "delivery_id": 98,
        "type": "package",
        "status": "returned",
        "return_type": "full_order_return",
        "delivery_date": "2026-11-26",
        "delivery_remark": "Customer out of station",
        "delivery_photo_url": "/uploads/return_photo_178168231.png",
        "delivery_latitude": 23.260120,
        "delivery_longitude": 77.412400,
        "customer": { ... },
        "order_details": {
          "package_name": "Family Pack",
          "total_items": 3,
          "items": [
            {
              "delivery_item_id": 390,
              "product_id": 5,
              "product_name": "Potato",
              "qty": 500,
              "unit": "gm",
              "return_status": "requested",
              "return_qty": 500,
              "return_reason": "Customer out of station",
              "return_photo_url": "/uploads/return_photo_178168231.png"
            }
          ]
        }
      }
    ]
  }
}
```

---

## 📦 5. Active Deliveries Grouped by Customer

### `GET /api/today-deliveries`
Yeh API sabhi **pending/ready_for_delivery** orders ko customer-wise group karke laati hai (route map and navigation ke liye useful).

#### Request Headers:
```http
Authorization: Bearer <token>
```

#### Query Parameters (Optional):
- `date`: `YYYY-MM-DD` (defaults to today)

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "deliveries": [
    {
      "user": {
        "id": 45,
        "name": "Mr. Rahul Sharma",
        "phone": "9826012345",
        "address": "Flat 204, Green Heights, Arera Colony, Bhopal - 462016",
        "address_id": 14,
        "latitude": 23.259933,
        "longitude": 77.412615
      },
      "schedules": [
        {
          "schedule_id": 108,
          "type": "package",
          "status": "ready_for_delivery",
          "package": "SARAN JI NANO",
          "time_slot": "05:00 PM - 07:00 PM",
          "items": [
            {
              "delivery_item_id": 412,
              "product_id": 5,
              "product": "Potato",
              "hindi_name": "आलू",
              "qty_gm": 500,
              "unit": "gm",
              "image_url": "https://backend.rambhaji.com/uploads/potato.jpg",
              "return_status": "none",
              "return_qty": null,
              "return_reason": null
            }
          ]
        }
      ]
    }
  ]
}
```

---

## ✅ 6. Mark Order As Delivered (Photo + Remark + Current GPS Location)

### `POST /api/mark-delivered`
Jab delivery boy customer ke address par order deliver karta hai, tab yeh API call karni hai.

> [!IMPORTANT]
> Delivery boy ke mobile device ki **current live location** (`latitude` & `longitude`), **delivery proof photo**, aur **remark** backend me save honge.

#### Request Headers:
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Request FormData Body:
| Key | Type | Required | Description |
|---|---|---|---|
| `schedule_id` | Integer | **Yes** | Delivery / Schedule ID (e.g. `108`) |
| `type` | String | No | `'package'` (default) ya `'retail'` |
| `photo` | File (Binary) | **Yes\*** | Camera se li gayi delivery proof photo |
| `remark` | String | **Yes\*** | Delivery remark / comment (e.g. "Handed over to customer", "Gate pe rakha") |
| `latitude` | Decimal / String | **Yes** | Device current latitude (e.g. `23.259933`) |
| `longitude` | Decimal / String | **Yes** | Device current longitude (e.g. `77.412615`) |

*\*Note: Either `photo` or `remark` is required, dono bhejna recommended hai.*

#### React Native Code Example:
```javascript
const formData = new FormData();
formData.append('schedule_id', order.delivery_id);
formData.append('type', order.type || 'package');
formData.append('remark', deliveryRemark);
formData.append('latitude', String(currentLocation.latitude));
formData.append('longitude', String(currentLocation.longitude));

if (photoUri) {
  const filename = photoUri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;
  formData.append('photo', {
    uri: photoUri,
    name: filename || 'delivery_proof.jpg',
    type: type
  });
}

const response = await axios.post('https://backend.rambhaji.com/api/mark-delivered', formData, {
  headers: {
    Authorization: `Bearer ${userToken}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Delivery marked as delivered successfully"
}
```

---

## 🔄 7. Return Entire Order (Before OR After Delivery)

### `POST /api/boy-return-order`
Jab delivery boy pura ka pura order return karna chahta ho:
- **Deliver hone se pehle:** (Customer ghar par nahi mila / Customer ne lene se mana kar diya / Address nahi mila)
- **Deliver hone ke baad:** (Customer ne hand to hand pura pack return kar diya)

#### Request Headers:
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Request FormData Body:
| Key | Type | Required | Description |
|---|---|---|---|
| `schedule_id` | Integer | **Yes** | Delivery / Schedule ID (e.g. `108`) |
| `type` | String | No | `'package'` (default) ya `'retail'` |
| `return_reason`| String | **Yes** | Reason for return (e.g. "Customer out of station", "Customer refused to accept") |
| `photo` | File (Binary) | **Yes** | Returned packet / premises ki photo |
| `latitude` | Decimal / String | No | Current device latitude |
| `longitude` | Decimal / String | No | Current device longitude |

#### Behavior:
- Agar order deliver hone se pehle return hota hai, toh schedule status seedha `'returned'` ho jata hai aur customer ke wallet se koi delivery charge/amount debit nahi hota.
- Sabhi items ke `return_status` ko `'requested'` mark kar diya jata hai taaki Admin dashboard par return review ho sake.

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Order returned successfully and queued for review"
}
```

---

## 🍅 8. Return Individual Item (Partial Return, Before OR After Delivery)

### `POST /api/boy-return-item`
Jab order ke andar se koi specific item (e.g., Tomato gal gaya tha ya 250g Mirchi customer ne return ki) return karna ho:
- **Deliver hone se pehle:** Delivery boy packing kholkar kharab item nikal kar return mark kar sakta hai, aur baki order deliver kar sakta hai.
- **Deliver hone ke baad:** Customer ki request par item return mark kar sakta hai.

#### Request Headers:
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Request FormData Body:
| Key | Type | Required | Description |
|---|---|---|---|
| `delivery_item_id` | Integer | **Yes** | Item ka ID (jo `order_details.items[].delivery_item_id` se milta hai) |
| `return_qty` | Decimal | **Yes** | Return karne wali quantity (gm me, e.g. `250`) |
| `return_reason` | String | **Yes** | Reason (e.g. "Rotten/Damaged", "Wrong quantity", "Customer rejected") |
| `photo` | File (Binary) | **Yes** | Damaged item ki photo |

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Return processed successfully by Delivery Boy"
}
```

---

## 📜 9. Delivery Boy Returns History

### `GET /api/boy-returns`
Delivery boy dwara initiate kiye gaye sabhi returns ki list aur unka admin approval status dekhne ke liye.

#### Query Parameters (Optional):
| Param | Type | Description |
|---|---|---|
| `date` | String | Specific date (`YYYY-MM-DD`) |
| `from_date` | String | Range start date (`YYYY-MM-DD`) |
| `to_date` | String | Range end date (`YYYY-MM-DD`) |
| `status` | String | Filter by status (`all`, `requested`, `approved`, `rejected`) |

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "total_returned_items": 3,
  "total_returned_retail_orders": 1,
  "returned_subscription_items": [
    {
      "id": 412,
      "qty_gm": "500.00",
      "return_qty": "250.00",
      "return_reason": "Damaged items found in bag",
      "return_photo_url": "/uploads/return_img_123.jpg",
      "return_status": "requested",
      "returned_by": "delivery_boy",
      "Product": {
        "id": 5,
        "name": "Tomato",
        "hindi_name": "टमाटर",
        "unit": "gm",
        "image_url": "/uploads/tomato.jpg"
      },
      "DeliverySchedule": {
        "id": 108,
        "scheduled_date": "2026-11-26",
        "Subscription": {
          "User": {
            "id": 45,
            "name": "Mr. Rahul Sharma",
            "phone": "9826012345"
          },
          "Package": {
            "name": "SARAN JI NANO"
          }
        }
      }
    }
  ],
  "returned_retail_orders": [...]
}
```

---

## 📜 10. Delivery Boy Past History

### `GET /api/boy-history`
Delivery boy dwara complete kiye gaye deliveries ki past history.

#### Query Parameters (Optional):
- `date`: `YYYY-MM-DD`
- `from_date`: `YYYY-MM-DD`
- `to_date`: `YYYY-MM-DD`
- `all_time`: `'true'`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "deliveries": [
    {
      "id": 105,
      "scheduled_date": "2026-11-25",
      "actual_delivery_date": "2026-11-25",
      "status": "delivered",
      "delivery_photo_url": "/uploads/proof.jpg",
      "delivery_remark": "Delivered to security guard",
      "Subscription": { ... },
      "DeliveryItems": [ ... ]
    }
  ]
}
```

---

## 💡 11. React Native Developer Implementation Tips

### 1. Capturing GPS Coordinates in React Native (Expo)
```javascript
import * as Location from 'expo-location';

const getCurrentCoordinates = async () => {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    alert('Location permission is required to mark delivery.');
    return null;
  }
  let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude
  };
};
```

### 2. Opening Google Maps / Navigation for Customer Address
```javascript
import { Linking, Platform } from 'react-native';

const openMapsNavigation = (latitude, longitude, address) => {
  const label = encodeURIComponent(address || 'Customer Location');
  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
    android: `geo:0,0?q=${latitude},${longitude}(${label})`
  });
  Linking.openURL(url);
};
```

### 3. Handling Image Picker / Camera
```javascript
import * as ImagePicker from 'expo-image-picker';

const takeDeliveryProofPhoto = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    alert('Camera permission is required');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7 // Compress to keep upload fast
  });
  if (!result.canceled) {
    return result.assets[0].uri;
  }
  return null;
};
```

---

## 📞 Support & Contacts
- Backend Lead: RamBhaji Tech Team
- Production URL: `https://backend.rambhaji.com`
