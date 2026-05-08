-- Hotel Management System
-- Final demo seed data for MySQL 8+
-- Run this file after 01_create_schema.sql

USE hm_pbl;

INSERT INTO users
    (user_code, full_name, email, country_code, phone_number, address_line, username, password_hash, role, account_status, failed_login_attempts, first_login_required)
VALUES
    ('CUS1001', 'Aarav Sharma', 'aarav@example.com', '+91', '9876543210', '221 Residency Road, Bengaluru, Karnataka', 'aarav', SHA2('Cust@123', 256), 'CUSTOMER', 'ACTIVE', 0, FALSE),
    ('ADM1001', 'Front Office Admin', 'admin@hotel.com', '+91', '9999999999', 'Hotel HQ, Bengaluru', 'admin', SHA2('Admin@123', 256), 'ADMIN', 'ACTIVE', 0, FALSE),
    ('STF1001', 'Support Staff', 'staff@hotel.com', '+91', '8888888888', 'Operations Wing, Bengaluru', 'staff', SHA2('Staff@123', 256), 'STAFF', 'ACTIVE', 0, FALSE);

INSERT INTO cities (city_code, city_name, state_name)
VALUES
    ('BLR', 'Bengaluru', 'Karnataka'),
    ('MUM', 'Mumbai', 'Maharashtra'),
    ('DEL', 'Delhi', 'Delhi'),
    ('HYD', 'Hyderabad', 'Telangana'),
    ('GOA', 'Panaji', 'Goa');

INSERT INTO hotels
    (hotel_code, city_id, hotel_name, address_line, contact_phone, contact_email, star_rating, description_text)
VALUES
    ('BLR01', (SELECT city_id FROM cities WHERE city_code = 'BLR'), 'Bengaluru Grand Residency', 'MG Road, Bengaluru', '9123456701', 'blr01@hm.com', 4, 'Central business hotel with fast check-in and city access.'),
    ('BLR02', (SELECT city_id FROM cities WHERE city_code = 'BLR'), 'Garden City Comforts', 'Indiranagar, Bengaluru', '9123456702', 'blr02@hm.com', 4, 'Comfort stay near dining and shopping districts.'),
    ('BLR03', (SELECT city_id FROM cities WHERE city_code = 'BLR'), 'Tech Park Inn', 'Whitefield, Bengaluru', '9123456703', 'blr03@hm.com', 4, 'Business-focused property for weekday travellers.'),
    ('BLR04', (SELECT city_id FROM cities WHERE city_code = 'BLR'), 'Lakeview Palace Bengaluru', 'Hebbal, Bengaluru', '9123456704', 'blr04@hm.com', 5, 'Upscale stay with premium family rooms.'),
    ('BLR05', (SELECT city_id FROM cities WHERE city_code = 'BLR'), 'Airport Horizon Suites', 'Devanahalli, Bengaluru', '9123456705', 'blr05@hm.com', 4, 'Transit-friendly hotel close to the airport.'),
    ('MUM01', (SELECT city_id FROM cities WHERE city_code = 'MUM'), 'Mumbai Marine Stay', 'Marine Drive, Mumbai', '9123456711', 'mum01@hm.com', 4, 'Sea-facing property with modern facilities.'),
    ('MUM02', (SELECT city_id FROM cities WHERE city_code = 'MUM'), 'Bandra Urban Nest', 'Bandra West, Mumbai', '9123456712', 'mum02@hm.com', 4, 'Stylish hotel for city breaks and short stays.'),
    ('MUM03', (SELECT city_id FROM cities WHERE city_code = 'MUM'), 'Andheri Business Hub', 'Andheri East, Mumbai', '9123456713', 'mum03@hm.com', 4, 'Designed for business travel and meetings.'),
    ('MUM04', (SELECT city_id FROM cities WHERE city_code = 'MUM'), 'Gateway Crown Hotel', 'Colaba, Mumbai', '9123456714', 'mum04@hm.com', 5, 'Premium property for luxury city stays.'),
    ('MUM05', (SELECT city_id FROM cities WHERE city_code = 'MUM'), 'Airport Elite Mumbai', 'Sahar Road, Mumbai', '9123456715', 'mum05@hm.com', 4, 'Convenient hotel with quick airport access.'),
    ('DEL01', (SELECT city_id FROM cities WHERE city_code = 'DEL'), 'Delhi Imperial Rooms', 'Connaught Place, Delhi', '9123456721', 'del01@hm.com', 4, 'Classic central hotel with spacious rooms.'),
    ('DEL02', (SELECT city_id FROM cities WHERE city_code = 'DEL'), 'South Delhi Retreat', 'Saket, Delhi', '9123456722', 'del02@hm.com', 4, 'Comfort-focused property close to malls and metro.'),
    ('DEL03', (SELECT city_id FROM cities WHERE city_code = 'DEL'), 'Aero City Plaza', 'Aerocity, Delhi', '9123456723', 'del03@hm.com', 5, 'Airport corridor hotel with premium amenities.'),
    ('DEL04', (SELECT city_id FROM cities WHERE city_code = 'DEL'), 'Capital Suites Delhi', 'Karol Bagh, Delhi', '9123456724', 'del04@hm.com', 4, 'Family-friendly hotel with large rooms.'),
    ('DEL05', (SELECT city_id FROM cities WHERE city_code = 'DEL'), 'Heritage Court Delhi', 'Paharganj, Delhi', '9123456725', 'del05@hm.com', 3, 'Value stay for budget-conscious travellers.'),
    ('HYD01', (SELECT city_id FROM cities WHERE city_code = 'HYD'), 'Hyderabad Pearl Residency', 'Banjara Hills, Hyderabad', '9123456731', 'hyd01@hm.com', 4, 'Balanced mix of comfort and business features.'),
    ('HYD02', (SELECT city_id FROM cities WHERE city_code = 'HYD'), 'Charminar Comfort Inn', 'Abids, Hyderabad', '9123456732', 'hyd02@hm.com', 3, 'Well-connected hotel for city explorers.'),
    ('HYD03', (SELECT city_id FROM cities WHERE city_code = 'HYD'), 'HiTech City Towers', 'Madhapur, Hyderabad', '9123456733', 'hyd03@hm.com', 4, 'Ideal for tech-park travellers and teams.'),
    ('HYD04', (SELECT city_id FROM cities WHERE city_code = 'HYD'), 'Royal Deccan Suites', 'Jubilee Hills, Hyderabad', '9123456734', 'hyd04@hm.com', 5, 'Luxury-focused hotel with larger rooms.'),
    ('HYD05', (SELECT city_id FROM cities WHERE city_code = 'HYD'), 'Airport Bay Hyderabad', 'Shamshabad, Hyderabad', '9123456735', 'hyd05@hm.com', 4, 'Quick stopover hotel near the airport.'),
    ('GOA01', (SELECT city_id FROM cities WHERE city_code = 'GOA'), 'Goa Seabreeze Resort', 'Miramar, Panaji', '9123456741', 'goa01@hm.com', 4, 'Leisure-friendly property near the coast.'),
    ('GOA02', (SELECT city_id FROM cities WHERE city_code = 'GOA'), 'Panaji Central Stay', 'Campal, Panaji', '9123456742', 'goa02@hm.com', 3, 'Convenient city hotel for short breaks.'),
    ('GOA03', (SELECT city_id FROM cities WHERE city_code = 'GOA'), 'Harbour View Goa', 'Dona Paula, Panaji', '9123456743', 'goa03@hm.com', 4, 'Scenic property with spacious premium rooms.'),
    ('GOA04', (SELECT city_id FROM cities WHERE city_code = 'GOA'), 'Sunset Palm Retreat', 'Caranzalem, Panaji', '9123456744', 'goa04@hm.com', 4, 'Relaxed resort-style stay for families.'),
    ('GOA05', (SELECT city_id FROM cities WHERE city_code = 'GOA'), 'Coastal Crown Panaji', 'Altinho, Panaji', '9123456745', 'goa05@hm.com', 5, 'Premium city resort with luxury inventory.');

INSERT INTO amenities (amenity_name)
VALUES
    ('WiFi'),
    ('TV'),
    ('AC'),
    ('Mini-bar'),
    ('Breakfast'),
    ('Work Desk');

INSERT INTO rooms
    (hotel_id, room_number, room_type, bed_type, price_per_night, room_status, is_bookable, max_adults, max_children, size_sq_ft, description_text)
WITH RECURSIVE seq AS (
    SELECT 1 AS room_index
    UNION ALL
    SELECT room_index + 1 FROM seq WHERE room_index < 5
)
SELECT
    h.hotel_id,
    CONCAT(h.hotel_code, '-', 100 + seq.room_index),
    CASE WHEN seq.room_index <= 3 THEN 'Deluxe' ELSE 'Luxury' END,
    CASE WHEN seq.room_index <= 3 THEN 'Queen' ELSE 'King' END,
    CASE WHEN seq.room_index <= 3 THEN 4500 + (h.hotel_id * 20) ELSE 7200 + (h.hotel_id * 25) END,
    'AVAILABLE',
    TRUE,
    CASE WHEN seq.room_index <= 3 THEN 2 ELSE 4 END,
    CASE WHEN seq.room_index <= 3 THEN 1 ELSE 2 END,
    CASE WHEN seq.room_index <= 3 THEN 320 ELSE 460 END,
    CASE
        WHEN seq.room_index <= 3 THEN CONCAT('Deluxe room in ', h.hotel_name, ' suited for short family or business stays.')
        ELSE CONCAT('Luxury room in ', h.hotel_name, ' with added comfort for premium stays.')
    END
FROM hotels h
CROSS JOIN seq;

INSERT INTO room_amenities (room_id, amenity_id)
SELECT r.room_id, a.amenity_id
FROM rooms r
JOIN amenities a
WHERE (r.room_type = 'Deluxe' AND a.amenity_name IN ('WiFi', 'TV', 'AC', 'Breakfast'))
   OR (r.room_type = 'Luxury' AND a.amenity_name IN ('WiFi', 'TV', 'AC', 'Mini-bar', 'Breakfast', 'Work Desk'));

INSERT INTO bookings
    (booking_code, customer_id, room_id, check_in_date, check_out_date, adults_count, children_count, booking_status, payment_status, payment_method, special_requests, total_nights, base_amount, tax_amount, discount_amount, total_amount, refund_amount)
VALUES
    (
        'BK2001',
        (SELECT user_id FROM users WHERE user_code = 'CUS1001'),
        (SELECT room_id FROM rooms WHERE room_number = 'BLR01-102'),
        DATE_ADD(CURDATE(), INTERVAL 10 DAY),
        DATE_ADD(CURDATE(), INTERVAL 13 DAY),
        2,
        1,
        'CONFIRMED',
        'PAID',
        'Credit Card',
        'Late check-in requested',
        3,
        13620.00,
        2451.60,
        0.00,
        16071.60,
        0.00
    ),
    (
        'BK2002',
        (SELECT user_id FROM users WHERE user_code = 'CUS1001'),
        (SELECT room_id FROM rooms WHERE room_number = 'MUM01-104'),
        DATE_SUB(CURDATE(), INTERVAL 12 DAY),
        DATE_SUB(CURDATE(), INTERVAL 9 DAY),
        2,
        0,
        'CHECKED_OUT',
        'PAID',
        'UPI',
        '',
        3,
        21750.00,
        3915.00,
        0.00,
        25665.00,
        0.00
    );

INSERT INTO payments
    (payment_code, booking_id, amount_paid, payment_method, payment_status, cardholder_name, card_last4, gateway_reference, paid_at)
VALUES
    (
        'TXN93211',
        (SELECT booking_id FROM bookings WHERE booking_code = 'BK2001'),
        16071.60,
        'Credit Card',
        'SUCCESS',
        'Aarav Sharma',
        '4242',
        'GWREF93211',
        NOW()
    ),
    (
        'TXN91001',
        (SELECT booking_id FROM bookings WHERE booking_code = 'BK2002'),
        25665.00,
        'UPI',
        'SUCCESS',
        NULL,
        NULL,
        'GWREF91001',
        DATE_SUB(NOW(), INTERVAL 9 DAY)
    );

INSERT INTO bills
    (bill_number, booking_id, customer_id, issue_date, room_charges, service_charges, tax_amount, discount_amount, total_amount, payment_status, notes)
VALUES
    (
        'BILL4001',
        (SELECT booking_id FROM bookings WHERE booking_code = 'BK2002'),
        (SELECT user_id FROM users WHERE user_code = 'CUS1001'),
        DATE_SUB(NOW(), INTERVAL 9 DAY),
        21750.00,
        0.00,
        3915.00,
        0.00,
        25665.00,
        'PAID',
        'Generated for completed stay'
    ),
    (
        'BILL4002',
        (SELECT booking_id FROM bookings WHERE booking_code = 'BK2001'),
        (SELECT user_id FROM users WHERE user_code = 'CUS1001'),
        NOW(),
        13620.00,
        0.00,
        2451.60,
        0.00,
        16071.60,
        'PAID',
        'Advance invoice for upcoming booking'
    );

INSERT INTO bill_items
    (bill_id, item_type, item_description, quantity, unit_price, line_total)
VALUES
    ((SELECT bill_id FROM bills WHERE bill_number = 'BILL4001'), 'ROOM_CHARGE', 'Luxury Room Stay', 3, 7250.00, 21750.00),
    ((SELECT bill_id FROM bills WHERE bill_number = 'BILL4001'), 'TAX', 'GST and service tax', 1, 3915.00, 3915.00),
    ((SELECT bill_id FROM bills WHERE bill_number = 'BILL4002'), 'ROOM_CHARGE', 'Deluxe Room Stay', 3, 4540.00, 13620.00),
    ((SELECT bill_id FROM bills WHERE bill_number = 'BILL4002'), 'TAX', 'GST and service tax', 1, 2451.60, 2451.60);

INSERT INTO complaints
    (complaint_code, customer_id, booking_id, category, complaint_title, complaint_description, contact_preference, complaint_status, assigned_to, expected_resolution_date, response_text, resolution_notes)
VALUES
    (
        'CMP3001',
        (SELECT user_id FROM users WHERE user_code = 'CUS1001'),
        (SELECT booking_id FROM bookings WHERE booking_code = 'BK2001'),
        'SERVICE_ISSUE',
        'Breakfast timing mismatch at restaurant',
        'Restaurant team denied early breakfast even though it was mentioned at check-in.',
        'EMAIL',
        'IN_PROGRESS',
        (SELECT user_id FROM users WHERE user_code = 'STF1001'),
        DATE_ADD(CURDATE(), INTERVAL 2 DAY),
        'Team has been informed and is reviewing the shift log.',
        NULL
    );

INSERT INTO complaint_actions
    (complaint_id, action_by, previous_status, new_status, action_note)
VALUES
    (
        (SELECT complaint_id FROM complaints WHERE complaint_code = 'CMP3001'),
        (SELECT user_id FROM users WHERE user_code = 'ADM1001'),
        'OPEN',
        'IN_PROGRESS',
        'Complaint assigned to support staff for review.'
    ),
    (
        (SELECT complaint_id FROM complaints WHERE complaint_code = 'CMP3001'),
        (SELECT user_id FROM users WHERE user_code = 'STF1001'),
        'IN_PROGRESS',
        'IN_PROGRESS',
        'Restaurant operations log is being verified with the shift supervisor.'
    );
