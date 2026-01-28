-- Insert sample nodes (Bangalore locations)
INSERT INTO nodes (lat, lng, name) VALUES
(12.9716, 77.5946, 'MG Road'),
(12.9352, 77.6245, 'Indiranagar'),
(12.95, 77.6, 'Koramangala'),
(12.98, 77.59, 'Bannerghatta Road'),
(13.0, 77.55, 'Yeshwantpur'),
(12.92, 77.58, 'Jayanagar'),
(12.91, 77.61, 'HSR Layout'),
(12.97, 77.55, 'Malleshwaram'),
(12.99, 77.65, 'Whitefield'),
(13.03, 77.58, 'Hebbal');

-- Insert sample edges (connections between nodes with distances and travel times)
INSERT INTO edges (from_node, to_node, distance_km, travel_time_min) VALUES
(1, 2, 8.5, 20),
(1, 3, 6.2, 15),
(1, 4, 12.3, 25),
(2, 3, 3.8, 10),
(2, 9, 15.2, 30),
(3, 6, 5.1, 12),
(3, 7, 4.7, 11),
(4, 5, 9.8, 22),
(5, 8, 7.3, 18),
(6, 7, 2.9, 8),
(6, 10, 11.4, 24),
(7, 9, 13.6, 28),
(8, 1, 10.2, 23),
(8, 5, 6.7, 16),
(9, 10, 8.9, 20),
(10, 4, 14.1, 32);

-- Since edges are directional, we'll also add reverse connections
INSERT INTO edges (from_node, to_node, distance_km, travel_time_min) VALUES
(2, 1, 8.5, 20),
(3, 1, 6.2, 15),
(4, 1, 12.3, 25),
(3, 2, 3.8, 10),
(9, 2, 15.2, 30),
(6, 3, 5.1, 12),
(7, 3, 4.7, 11),
(5, 4, 9.8, 22),
(8, 5, 7.3, 18),
(7, 6, 2.9, 8),
(10, 6, 11.4, 24),
(9, 7, 13.6, 28),
(1, 8, 10.2, 23),
(5, 8, 6.7, 16),
(10, 9, 8.9, 20),
(4, 10, 14.1, 32);