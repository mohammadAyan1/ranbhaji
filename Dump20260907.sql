-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: mysql-3dad6943-mohammadayan2210-8241.a.aivencloud.com    Database: rambhaji
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '12e71f24-9474-11f1-843e-fa299255a22b:1-78713,
8e0a9de8-786d-11f1-af9f-36d9b2db8e02:1-2380,
937834f0-4092-11f1-b16d-e29b503da54d:1-6237,
ce353226-197e-11f1-847d-4a2cf2794dc0:1-43';

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addresses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `address_line` varchar(255) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `landmark` varchar(100) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '1',
  `user_id` int DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `zone` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES (1,'Ayodhya nagar ','Bhopal','462022','Isro colony hig 87',0,91,NULL,NULL,NULL),(2,'Ayodhya nagar ','Bhopal','462022','Isro colony hig 87',1,91,NULL,NULL,NULL),(3,'Ashoka Garder','Bhopal','462022','80 feet road',1,89,NULL,NULL,NULL);
/*!40000 ALTER TABLE `addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_logs`
--

DROP TABLE IF EXISTS `attendance_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `login_time` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `delivery_boy_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `delivery_boy_id` (`delivery_boy_id`),
  CONSTRAINT `attendance_logs_ibfk_1` FOREIGN KEY (`delivery_boy_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_logs`
--

LOCK TABLES `attendance_logs` WRITE;
/*!40000 ALTER TABLE `attendance_logs` DISABLE KEYS */;
INSERT INTO `attendance_logs` VALUES (1,'2026-09-07','2026-09-07 07:15:22','2026-09-07 07:15:22','2026-09-07 07:15:22',90);
/*!40000 ALTER TABLE `attendance_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_processing_logs`
--

DROP TABLE IF EXISTS `batch_processing_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_processing_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `processed_qty_gm` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `batch_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `process_type` varchar(50) DEFAULT 'soaking',
  `time_taken_minutes` decimal(10,2) DEFAULT '0.00',
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `expected_time_taken_minutes` decimal(10,2) DEFAULT '0.00',
  `completed_by_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `batch_processing_logs_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `batch_processing_logs_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_processing_logs`
--

LOCK TABLES `batch_processing_logs` WRITE;
/*!40000 ALTER TABLE `batch_processing_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_processing_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_product_demands`
--

DROP TABLE IF EXISTS `batch_product_demands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_product_demands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity_grams` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `batch_product_demands_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `batch_product_demands_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_product_demands`
--

LOCK TABLES `batch_product_demands` WRITE;
/*!40000 ALTER TABLE `batch_product_demands` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_product_demands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_product_tasks`
--

DROP TABLE IF EXISTS `batch_product_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_product_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `product_id` int NOT NULL,
  `stage` enum('WEIGHING','SOAKING','CUTTING','DRYING','BUCKET_ARRANGE') NOT NULL,
  `quantity_grams` decimal(12,2) NOT NULL,
  `status` enum('NOT_STARTED','RUNNING','ALARM','PAUSED','DONE') DEFAULT 'NOT_STARTED',
  `duration_seconds` int NOT NULL DEFAULT '0',
  `remaining_seconds` int NOT NULL DEFAULT '0',
  `started_at` datetime DEFAULT NULL,
  `paused_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `alarm_fired_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `drying_mode` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `batch_product_tasks_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `batch_product_tasks_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_product_tasks`
--

LOCK TABLES `batch_product_tasks` WRITE;
/*!40000 ALTER TABLE `batch_product_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_product_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_splits`
--

DROP TABLE IF EXISTS `batch_splits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_splits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `qty_kg` decimal(10,3) NOT NULL,
  `stage` enum('pending','weighing_start','soaking','cleaning_cutting','drying','weighing_end','wrapping','packing','completed') DEFAULT 'pending',
  `status` enum('waiting','in_progress','completed') DEFAULT 'waiting',
  `total_work_minutes` decimal(10,2) DEFAULT NULL,
  `remaining_work_minutes` decimal(10,2) DEFAULT NULL,
  `active_worker_count` int DEFAULT '0',
  `last_recalculated_at` datetime DEFAULT NULL,
  `stage_started_at` datetime DEFAULT NULL,
  `stage_completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `batch_splits_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_splits`
--

LOCK TABLES `batch_splits` WRITE;
/*!40000 ALTER TABLE `batch_splits` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_splits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batches`
--

DROP TABLE IF EXISTS `batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batches`
--

LOCK TABLES `batches` WRITE;
/*!40000 ALTER TABLE `batches` DISABLE KEYS */;
INSERT INTO `batches` VALUES (1,'1-3AM','active',0,'2026-09-07 12:31:43','2026-09-07 12:31:43');
/*!40000 ALTER TABLE `batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calculator_draft_items`
--

DROP TABLE IF EXISTS `calculator_draft_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calculator_draft_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qty_gm` decimal(10,2) DEFAULT NULL,
  `is_fixed` tinyint(1) DEFAULT '1',
  `is_seasonal` tinyint(1) DEFAULT '0',
  `draft_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `draft_id` (`draft_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `calculator_draft_items_ibfk_61` FOREIGN KEY (`draft_id`) REFERENCES `calculator_drafts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `calculator_draft_items_ibfk_62` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calculator_draft_items`
--

LOCK TABLES `calculator_draft_items` WRITE;
/*!40000 ALTER TABLE `calculator_draft_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `calculator_draft_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calculator_drafts`
--

DROP TABLE IF EXISTS `calculator_drafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calculator_drafts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `margin_percent` decimal(5,2) DEFAULT '0.00',
  `services_per_month` int DEFAULT '1',
  `num_persons` int DEFAULT '2',
  `calculated_price` decimal(10,2) DEFAULT '0.00',
  `max_fixed_count` int DEFAULT '0',
  `max_seasonal_count` int DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `seasonal_quantities` json DEFAULT NULL,
  `draft_type` varchar(50) DEFAULT 'price_calculator',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calculator_drafts`
--

LOCK TABLES `calculator_drafts` WRITE;
/*!40000 ALTER TABLE `calculator_drafts` DISABLE KEYS */;
/*!40000 ALTER TABLE `calculator_drafts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_log`
--

DROP TABLE IF EXISTS `credit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month` varchar(20) DEFAULT NULL,
  `due_amount` decimal(10,2) DEFAULT NULL,
  `status` enum('pending','paid') DEFAULT NULL,
  `admin_override` tinyint(1) DEFAULT '0',
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `credit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_log`
--

LOCK TABLES `credit_log` WRITE;
/*!40000 ALTER TABLE `credit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `credit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_items`
--

DROP TABLE IF EXISTS `delivery_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qty_gm` decimal(10,2) DEFAULT NULL,
  `delivered_qty` decimal(10,2) DEFAULT NULL,
  `return_qty` decimal(10,2) DEFAULT NULL,
  `return_reason` varchar(255) DEFAULT NULL,
  `return_photo_url` varchar(255) DEFAULT NULL,
  `return_status` enum('none','requested','approved','rejected') DEFAULT 'none',
  `schedule_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `packed_qty` decimal(10,2) DEFAULT NULL,
  `returned_by` enum('user','admin','delivery_boy') DEFAULT 'user',
  `will_purchase` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `delivery_items_ibfk_61` FOREIGN KEY (`schedule_id`) REFERENCES `delivery_schedule` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `delivery_items_ibfk_62` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_items`
--

LOCK TABLES `delivery_items` WRITE;
/*!40000 ALTER TABLE `delivery_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_schedule`
--

DROP TABLE IF EXISTS `delivery_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scheduled_date` date DEFAULT NULL,
  `status` enum('pending','ready_for_delivery','delivered','skipped') DEFAULT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT '0',
  `delivery_boy_id` int DEFAULT NULL,
  `delivery_photo_url` varchar(255) DEFAULT NULL,
  `delivery_remark` varchar(255) DEFAULT NULL,
  `subscription_id` int DEFAULT NULL,
  `water_subscription_id` int DEFAULT NULL,
  `batch_id` int DEFAULT NULL,
  `is_returned_serving` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `delivery_boy_id` (`delivery_boy_id`),
  KEY `subscription_id` (`subscription_id`),
  KEY `water_subscription_id` (`water_subscription_id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `delivery_schedule_ibfk_92` FOREIGN KEY (`delivery_boy_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `delivery_schedule_ibfk_93` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `delivery_schedule_ibfk_94` FOREIGN KEY (`water_subscription_id`) REFERENCES `water_subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `delivery_schedule_ibfk_95` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_schedule`
--

LOCK TABLES `delivery_schedule` WRITE;
/*!40000 ALTER TABLE `delivery_schedule` DISABLE KEYS */;
INSERT INTO `delivery_schedule` VALUES (1,'2026-09-07','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(2,'2026-09-14','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(3,'2026-09-19','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(4,'2026-09-26','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(5,'2026-10-02','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(6,'2026-09-08','pending',NULL,0,NULL,NULL,NULL,5,NULL,1,0),(7,'2026-09-14','pending',NULL,0,NULL,NULL,NULL,5,NULL,1,0),(8,'2026-09-19','pending',NULL,0,NULL,NULL,NULL,5,NULL,1,0),(9,'2026-09-26','pending',NULL,0,NULL,NULL,NULL,5,NULL,1,0),(10,'2026-10-02','pending',NULL,0,NULL,NULL,NULL,5,NULL,1,0);
/*!40000 ALTER TABLE `delivery_schedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `franchises`
--

DROP TABLE IF EXISTS `franchises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `franchises` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `mobile_number` varchar(15) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `investment_capacity` varchar(100) DEFAULT NULL,
  `message` text,
  `status` enum('active','inactive') DEFAULT 'inactive',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `franchises`
--

LOCK TABLES `franchises` WRITE;
/*!40000 ALTER TABLE `franchises` DISABLE KEYS */;
/*!40000 ALTER TABLE `franchises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loss_logs`
--

DROP TABLE IF EXISTS `loss_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loss_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loss_date` date NOT NULL,
  `loss_qty` decimal(10,2) NOT NULL,
  `loss_type` enum('spoiled/unsold','extra_delivered') NOT NULL,
  `purchase_price_at_loss` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_loss_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `loss_logs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loss_logs`
--

LOCK TABLES `loss_logs` WRITE;
/*!40000 ALTER TABLE `loss_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `loss_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `missed_product_logs`
--

DROP TABLE IF EXISTS `missed_product_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `missed_product_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `missed_date` date NOT NULL,
  `missed_qty` decimal(10,2) NOT NULL,
  `next_schedule_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `source_type` enum('retail','subscription') DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `is_full_order` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `missed_product_logs_ibfk_5` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `missed_product_logs_ibfk_6` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `missed_product_logs`
--

LOCK TABLES `missed_product_logs` WRITE;
/*!40000 ALTER TABLE `missed_product_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `missed_product_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(150) DEFAULT NULL,
  `message` text,
  `type` enum('reminder','alert','recharge') DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `package_fixed_items`
--

DROP TABLE IF EXISTS `package_fixed_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_fixed_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `default_qty_gm` decimal(10,2) DEFAULT NULL,
  `package_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `package_id` (`package_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `package_fixed_items_ibfk_61` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `package_fixed_items_ibfk_62` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_fixed_items`
--

LOCK TABLES `package_fixed_items` WRITE;
/*!40000 ALTER TABLE `package_fixed_items` DISABLE KEYS */;
INSERT INTO `package_fixed_items` VALUES (13,1000.00,1,18),(14,1000.00,1,19),(15,100.00,1,26);
/*!40000 ALTER TABLE `package_fixed_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `package_seasonal_config`
--

DROP TABLE IF EXISTS `package_seasonal_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_seasonal_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `max_select_count` int DEFAULT NULL,
  `package_id` int DEFAULT NULL,
  `default_qty_gm` decimal(10,2) DEFAULT NULL,
  `seasonal_quantities` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `package_seasonal_config_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_seasonal_config`
--

LOCK TABLES `package_seasonal_config` WRITE;
/*!40000 ALTER TABLE `package_seasonal_config` DISABLE KEYS */;
INSERT INTO `package_seasonal_config` VALUES (1,3,1,NULL,'[750, 1000, 500]'),(2,3,1,NULL,'[750, 1000, 500]'),(3,3,1,NULL,'[750, 1000, 500]');
/*!40000 ALTER TABLE `package_seasonal_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `package_seasonal_pool`
--

DROP TABLE IF EXISTS `package_seasonal_pool`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_seasonal_pool` (
  `id` int NOT NULL AUTO_INCREMENT,
  `package_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `package_id` (`package_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `package_seasonal_pool_ibfk_61` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `package_seasonal_pool_ibfk_62` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_seasonal_pool`
--

LOCK TABLES `package_seasonal_pool` WRITE;
/*!40000 ALTER TABLE `package_seasonal_pool` DISABLE KEYS */;
INSERT INTO `package_seasonal_pool` VALUES (33,1,18),(34,1,19),(35,1,20),(36,1,21),(37,1,22),(38,1,23),(39,1,24),(40,1,25);
/*!40000 ALTER TABLE `package_seasonal_pool` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `packages`
--

DROP TABLE IF EXISTS `packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `packages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `num_persons` int DEFAULT NULL,
  `services_per_month` int DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `type` enum('standard','custom','yearly') DEFAULT NULL,
  `target_user_id` int DEFAULT NULL,
  `margin_percent` decimal(5,2) DEFAULT '0.00',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `num_persons_max` int DEFAULT NULL,
  `target_mobile_number` varchar(15) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `creation_source` varchar(255) DEFAULT 'manual',
  PRIMARY KEY (`id`),
  KEY `target_user_id` (`target_user_id`),
  CONSTRAINT `packages_ibfk_1` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `packages`
--

LOCK TABLES `packages` WRITE;
/*!40000 ALTER TABLE `packages` DISABLE KEYS */;
INSERT INTO `packages` VALUES (1,'Senior',2,5,1500.00,'standard',NULL,50.00,'active','2026-09-07 05:27:03',3,NULL,'/uploads/1788764485273-649595217.jpeg','manual');
/*!40000 ALTER TABLE `packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pause_log`
--

DROP TABLE IF EXISTS `pause_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pause_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pause_start` date DEFAULT NULL,
  `pause_end` date DEFAULT NULL,
  `requested_days` int DEFAULT NULL,
  `actual_days_used` int DEFAULT NULL,
  `type` enum('monthly','yearly') DEFAULT NULL,
  `status` enum('active','completed','cancelled') DEFAULT NULL,
  `subscription_id` int DEFAULT NULL,
  `water_subscription_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscription_id` (`subscription_id`),
  KEY `water_subscription_id` (`water_subscription_id`),
  CONSTRAINT `pause_log_ibfk_61` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `pause_log_ibfk_62` FOREIGN KEY (`water_subscription_id`) REFERENCES `water_subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pause_log`
--

LOCK TABLES `pause_log` WRITE;
/*!40000 ALTER TABLE `pause_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `pause_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_method` enum('wallet','razorpay','phonepe') DEFAULT NULL,
  `gateway_txn_id` varchar(100) DEFAULT NULL,
  `status` enum('success','failed','pending') DEFAULT NULL,
  `type` enum('package_purchase','recharge','extra_item','yearly_booking') DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
INSERT INTO `payment_transactions` VALUES (1,1500.00,'phonepe','PKG_1_monthly_1_null_1788783859198','pending','package_purchase','2026-09-07 12:24:19',91),(2,1500.00,'phonepe','PKG_1_monthly_2_null_1788783873465','pending','package_purchase','2026-09-07 12:24:33',91),(3,1500.00,'phonepe','PKG_1_monthly_2_null_1788784022908','pending','package_purchase','2026-09-07 12:27:02',91),(4,1500.00,'phonepe','PKG_1_monthly_3_1_1788784314552','success','package_purchase','2026-09-07 12:31:54',89),(5,1500.00,'phonepe','PKG_1_monthly_2_1_1788784360093','success','package_purchase','2026-09-07 12:32:40',91);
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_batches`
--

DROP TABLE IF EXISTS `production_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `date` date NOT NULL,
  `total_qty_kg` decimal(10,3) NOT NULL,
  `pending_qty_kg` decimal(10,3) NOT NULL,
  `status` enum('pending','in_progress','completed') DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `production_batches_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_batches`
--

LOCK TABLES `production_batches` WRITE;
/*!40000 ALTER TABLE `production_batches` DISABLE KEYS */;
INSERT INTO `production_batches` VALUES (1,18,'2026-09-07',1.000,1.000,'pending','2026-09-07 12:38:51','2026-09-07 12:38:51'),(2,26,'2026-09-07',0.100,0.100,'pending','2026-09-07 12:38:59','2026-09-07 12:38:59'),(3,19,'2026-09-07',1.000,1.000,'pending','2026-09-07 12:42:56','2026-09-07 12:42:56');
/*!40000 ALTER TABLE `production_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `category` enum('vegetable','fruit','water','exotic','salad') DEFAULT NULL,
  `sub_category` varchar(50) DEFAULT NULL,
  `purchase_price_per_gm` decimal(10,4) DEFAULT NULL,
  `selling_price_per_gm` decimal(10,4) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `total_purchased_qty` decimal(12,2) DEFAULT '0.00',
  `total_sold_qty` decimal(12,2) DEFAULT '0.00',
  `current_stock` decimal(12,2) DEFAULT '0.00',
  `hindi_name` varchar(100) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `soaking_time` decimal(10,2) DEFAULT '0.00',
  `cleaning_time` decimal(10,2) DEFAULT '0.00',
  `cutting_time` decimal(10,2) DEFAULT '0.00',
  `drying_time` decimal(10,2) DEFAULT '0.00',
  `weighting_time` decimal(10,2) DEFAULT '0.00',
  `description` text,
  `unit_id` int DEFAULT NULL,
  `min_retail_qty` decimal(10,2) DEFAULT '0.00',
  `default_margin_percentage` decimal(5,2) DEFAULT '0.00',
  `water_capacity_liters` decimal(10,2) DEFAULT '0.00',
  `plan_weight_g` decimal(10,2) DEFAULT '500.00',
  `soak_time_min` decimal(10,2) DEFAULT '0.00',
  `weigh_time_min` decimal(10,2) DEFAULT '0.00',
  `is_piece_based` tinyint(1) DEFAULT '1',
  `pieces_per_25g` decimal(10,2) DEFAULT '0.00',
  `clean_cut_time_per_piece_min` decimal(10,2) DEFAULT '0.00',
  `clean_cut_time_per_25g_min` decimal(10,2) DEFAULT '0.00',
  `dry_cycle_time_min` decimal(10,2) DEFAULT '0.00',
  `dry_capacity_kg_per_load` decimal(10,2) DEFAULT '5.00',
  `dry_machine_count` int DEFAULT '1',
  `wrap_time_per_plan_min` decimal(10,2) DEFAULT '0.00',
  `pack_time_per_plan_min` decimal(10,2) DEFAULT '0.00',
  `weighing_time_seconds` int DEFAULT '0',
  `soaking_time_seconds` int DEFAULT '0',
  `cutting_mode` enum('PER_PIECE','PER_25G') DEFAULT 'PER_25G',
  `time_per_piece_seconds` int DEFAULT NULL,
  `time_per_25g_seconds` int DEFAULT NULL,
  `drying_time_seconds` int DEFAULT '0',
  `drying_time_per_25g_seconds` int DEFAULT '0',
  `drying_time_per_piece_seconds` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=108 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (18,'Potato','vegetable','leave',0.0200,0.0400,'gm','active','2026-06-24 13:26:25',1000.00,0.00,1000.00,'आलू','/uploads/1784629502472-1817621.jpg',0.12,1.00,1.00,1.00,0.50,'Amerikatairiku gensan no denpun-shitsu o fukumu kaikei yasai de, sekai no ōku no chiiki de shushoku to shite shōhi sa rete imasu.',3,0.25,100.00,0.00,500.00,0.00,0.00,1,3.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',30,NULL,100,5,3),(19,'Red Potato','vegetable','Root',0.0200,0.0300,'gm','active','2026-06-24 13:26:25',1000.00,0.00,1000.00,'लाल आलू','/uploads/1784637681823-590732334.jpg',0.40,0.34,0.12,0.50,0.90,'This is the potatao for test',3,250.00,50.00,0.00,500.00,0.00,0.00,1,6.00,0.00,0.00,0.00,5.00,1,0.00,0.00,120,720,'PER_PIECE',30,NULL,5,0,0),(20,'Onion','vegetable','root',0.0250,0.0500,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'प्याज ','/uploads/1784630292473-253167995.png',0.20,0.60,0.10,0.10,0.30,NULL,3,250.00,100.00,0.00,500.00,0.00,0.00,1,0.30,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',30,NULL,150,5,3),(21,'Small Onion','vegetable','root',0.0400,0.0280,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'छोटा प्याज़','/uploads/1784633139614-399886745.png',0.20,0.90,0.60,0.50,0.70,NULL,3,0.00,-30.00,0.00,500.00,1.50,1.00,1,4.00,0.00,3.00,2.30,5.00,1,0.00,0.00,60,120,'PER_PIECE',5,NULL,180,4,2),(22,'Desi Tomato','vegetable','root',0.0400,0.0540,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'देसी टमाटर ','/uploads/1784631680923-271076481.png',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,35.00,0.00,500.00,0.00,0.00,1,0.30,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',6,NULL,30,0,0),(23,'Hybrid Tomato','vegetable','root',0.0350,0.0385,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'हाइब्रिड टमाटर','/uploads/1784637218019-658382931.jpeg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,10.00,0.00,500.00,0.00,0.00,1,4.00,0.00,0.00,0.00,5.00,1,0.00,0.00,1,3,'PER_PIECE',10,NULL,3,0,0),(24,'Cherry Tomato','vegetable','root',0.2000,0.0540,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'चेरी टमाटर ','/uploads/1784637819133-738899684.jpeg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,-73.00,0.00,500.00,0.00,0.00,1,3.00,0.00,0.00,0.00,5.00,1,0.00,0.00,2,3,'PER_PIECE',12,NULL,4,0,0),(25,'Ginger','vegetable','root',0.1500,0.2561,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'अदरक','/uploads/1784633670510-951652691.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,70.70,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',120,NULL,30,0,0),(26,'Coriander Leaves','vegetable','root',0.0700,0.2180,'gm','active','2026-06-24 13:26:25',100.00,0.00,100.00,'धनिया','/uploads/1784632920874-247126100.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,211.40,0.00,500.00,0.00,0.00,1,2.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',8,120,900,0,0),(27,'Green Chilli Lite (Less Hot)','vegetable','root',0.0500,0.1300,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'हरी मिर्च','/uploads/1784633040405-487449498.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,160.00,0.00,500.00,0.00,0.00,1,6.00,0.00,0.00,0.00,5.00,1,0.00,0.00,2,3,'PER_PIECE',10,NULL,3,0,0),(28,'Green Chilli Hot','vegetable','root',0.0800,0.1300,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'तीखी हरी मिर्च ','/uploads/1784637102610-7345209.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,62.50,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',12,NULL,30,0,0),(29,'Green Chilli Big','vegetable','root',0.0900,0.1300,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'बड़ी हरी मिर्च','/uploads/1784637479987-767152260.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,44.40,0.00,500.00,0.00,0.00,1,6.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_PIECE',5,NULL,180,0,0),(30,'Green Chilli Small Hot','vegetable','root',0.1000,0.1000,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'हरी मिर्च छोटी गरम','/uploads/1784638772859-159614441.png',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,0.00,0.00,500.00,0.00,0.00,1,10.00,0.00,0.00,0.00,5.00,1,0.00,0.00,20,30,'PER_PIECE',3,NULL,200,0,0),(31,'Lemon','vegetable','root',0.0500,0.2000,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'नीम्बू','/uploads/1784633328551-714518508.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,300.00,0.00,500.00,0.00,0.00,1,0.75,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',6,NULL,30,0,0),(32,'Lemon Big','vegetable','root',0.1200,0.1500,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'बड़े नीम्बू','/uploads/1784638000635-106467344.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(33,'Garlic','vegetable','root',0.1600,0.2301,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लहसुन ','/uploads/1784634187451-686726959.png',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,43.80,0.00,500.00,2.00,1.00,1,1.50,0.00,3.00,0.50,5.00,1,0.00,0.00,30,720,'PER_PIECE',21,NULL,30,0,0),(34,'Garlic Peeled','vegetable','root',0.2400,0.1901,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'चिला हुआ लहसुन','/uploads/1784638130971-455450313.png',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,-20.80,0.00,500.00,0.00,0.00,1,6.00,0.00,0.00,0.00,5.00,1,0.00,0.00,100,150,'PER_PIECE',3,NULL,200,0,0),(35,'Capsicum','vegetable','root',0.0750,0.0980,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'शिमला मिर्च','/uploads/1784633436337-105233525.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,30.70,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',9,NULL,200,0,0),(36,'Brinjal Small White','vegetable','root',0.0300,0.0300,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'छोटे सफेद बैंगन','/uploads/1784638797791-906142229.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(37,'Brinjal Small Black','vegetable','root',0.0300,0.0540,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'छोटे काले बैगन','/uploads/1784636131965-261994223.jpeg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(38,'Brinjal Long White','vegetable','root',0.0300,0.0400,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,' लंबे सफेद बैंगन','/uploads/1784639709582-643479126.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(39,'Brinjal Long Black','vegetable','root',0.0300,0.0540,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,' लंबे काले बैंगन','/uploads/1784638889680-800683421.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(40,'Brinjal Big Black','vegetable','root',0.0300,0.0760,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'काले बड़े बैगन','/uploads/1784636324166-530906567.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(41,'Brinjal Big Black','vegetable','root',0.0300,0.0540,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'काले बड़े बैंगन','/uploads/1784639014386-211774174.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(42,'Mint','vegetable','root',0.0400,0.0250,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'पुदीना','/uploads/1784636629729-473285337.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(43,'Mushroom','vegetable','root',0.2500,0.0540,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'मशरूम','/uploads/1784637106235-977641923.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(44,'Zucchini Yellow','vegetable','root',0.2200,0.2640,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'पीली तोरई ','/uploads/1784722129750-847407854.png',6.00,1.10,1.00,1.00,0.80,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(45,'Zucchini Green','vegetable','root',0.2200,0.2420,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'हरी तोरई','/uploads/1784722467804-6862358.webp',2.00,1.00,1.10,1.00,1.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(46,'Iceberg Lettuce','vegetable','root',0.2000,0.3000,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'आइसबर्ग लेट्यूस','/uploads/1784637969693-675667222.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(47,'Basil Herb','vegetable','root',0.3000,0.3600,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'तुलसी जड़ी बूटी','/uploads/1784722132608-882391915.jpg',6.00,8.00,9.00,4.00,12.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(48,'Red Cabbage','vegetable','root',0.1400,0.1680,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लाल गोभी','/uploads/1784721851694-452161288.avif',29.00,20.00,10.00,20.00,6.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(49,'English Cucumber','vegetable','root',0.0700,0.0910,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'अंग्रेजी ककड़ी','/uploads/1784722262499-921265462.jpg',6.00,8.00,3.00,4.00,7.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(50,'Asparagus','vegetable','root',0.3000,0.3600,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'शतावरी','/uploads/1784721966282-900920603.jpg',5.00,7.00,8.00,6.00,3.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(51,'Celery','vegetable','root',0.3000,0.3300,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'सेलरी','/uploads/1784722672868-713391655.jpg',1.00,1.00,2.00,1.00,2.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(52,'Cucumber','vegetable','root',0.0400,0.0450,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'ककड़ी','/uploads/1784633880208-372806654.jpg',0.50,0.12,0.30,0.23,0.19,NULL,3,0.00,12.50,0.00,500.00,0.00,0.00,1,0.25,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',9,NULL,30,0,0),(53,'Amaranth Green','vegetable','root',0.0300,0.0360,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'अमरनाथ हरा','/uploads/1784722712724-542943058.jpg',5.00,6.00,7.00,8.00,9.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(54,'Amaranth Red','vegetable','root',0.0300,0.0360,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'अमरनाथ लाल','/uploads/1784722807409-975209311.jpg',5.00,6.00,7.00,8.00,9.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(55,'Apple Gourd','vegetable','root',0.0400,0.0820,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'टिंडा ','/uploads/1784634223452-630915306.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(56,'Bitter Gourd','vegetable','root',0.0400,0.0880,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'करेला ','/uploads/1784634369418-820033058.png',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(57,'Bottle Gourd','vegetable','root',0.0300,0.0600,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लौकी','/uploads/1784635188774-569784913.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,100.00,0.00,500.00,0.00,0.00,1,0.10,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',6,NULL,30,0,0),(58,'Cluster Beans','vegetable','root',0.0600,0.0980,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'गवार फल्ली','/uploads/1784635459857-502483229.jpeg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(59,'Corn','vegetable','root',0.0400,0.2050,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'','/uploads/1784634069968-127367103.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,412.50,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,100,200,'PER_PIECE',5,NULL,150,0,0),(60,'Drumstick','vegetable','root',0.0600,0.1460,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'मुनगा ','/uploads/1784634501500-380454906.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(61,'Ivy Gourd','vegetable','root',0.0400,0.0980,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'कुंदरू','/uploads/1784635240495-458865665.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(62,'Okra / Lady Finger','vegetable','root',0.0400,0.0680,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'भिंडी','/uploads/1784635822504-86322760.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,70.00,0.00,500.00,2.00,1.00,1,2.00,0.00,3.00,0.50,5.00,1,0.00,0.00,30,300,'PER_PIECE',3,NULL,30,0,0),(63,'Pointed Gourd','vegetable','root',0.0400,0.0720,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'परवल ','/uploads/1784636968843-128902478.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,80.00,0.00,500.00,0.00,0.00,1,0.70,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',6,NULL,30,0,0),(64,'Ridge Gourd','vegetable','root',0.0400,0.0500,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'तोरई ','/uploads/1784639585194-724533899.png',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(65,'Snake Gourd','vegetable','root',0.0450,0.0540,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'चिचिण्डा','/uploads/1784722587553-275337583.jpg',5.00,6.00,7.00,8.00,9.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(66,'Sponge Gourd','vegetable','root',0.0400,0.0780,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'गिलकी ','/uploads/1784635365058-366747871.png',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,95.00,0.00,500.00,0.00,0.00,1,0.70,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_PIECE',6,NULL,30,0,0),(67,'Green Beans (Barbatti)','vegetable','root',0.0450,0.0820,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'बरबटी','/uploads/1784636190797-842325867.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(68,'Bamboo Shoot','vegetable','root',0.2500,0.3000,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'बैम्बू शूट','/uploads/1784721738190-326536603.jpg',3.00,5.00,5.00,8.00,7.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(69,'Lotus Stem','vegetable','root',0.0700,0.0770,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'कमल ककड़ी','/uploads/1784722784194-823431484.jpg',2.00,1.00,1.00,0.50,2.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(70,'Pumpkin','vegetable','root',0.0300,0.0440,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'कद्दू ','/uploads/1784634634020-309883237.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,46.70,0.00,500.00,2.00,1.00,1,1.00,0.00,3.00,0.50,5.00,1,0.00,0.00,100,120,'PER_PIECE',6,NULL,200,0,0),(71,'Taro Root','vegetable','root',0.0400,0.0520,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'तारो जड़','/uploads/1784722440650-296178610.jpg',4.00,6.00,7.00,6.00,5.00,NULL,3,0.00,30.00,0.00,500.00,0.00,0.00,1,0.90,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',30,NULL,30,0,0),(72,'Yam','vegetable','root',0.0600,0.1000,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'सूरन ','/uploads/1784722997640-792367792.avif',5.00,6.00,7.00,8.00,9.00,NULL,3,0.00,66.70,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',3,NULL,30,0,0),(73,'Beetroot','vegetable','root',0.0300,0.0640,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'चुकंदर','/uploads/1784634728751-460014744.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,113.30,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',30,NULL,30,0,0),(74,'Broccoli','vegetable','root',0.1700,0.3800,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,' ब्रोकॉली','/uploads/1784721564754-924146320.jpg',1.00,2.00,3.00,4.00,5.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(75,'Cabbage','vegetable','root',0.0250,0.1560,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'पत्ता गोभी','/uploads/1784634765873-645794585.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,524.00,0.00,500.00,0.00,0.00,1,0.10,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_PIECE',12,NULL,30,0,0),(76,'Carrot','vegetable','root',0.0350,0.0580,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'गाजर','/uploads/1784635000738-10665515.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,65.70,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',18,NULL,30,0,0),(77,'Cauliflower','vegetable','root',0.0500,0.0980,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'फूल गोभी','/uploads/1784635003523-828680569.png',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,96.00,0.00,500.00,0.00,0.00,1,0.10,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',12,0,30,0,0),(78,'Fenugreek','vegetable','root',0.0350,0.0420,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'मेथी','/uploads/1784722890749-296550438.png',5.00,6.00,7.00,8.00,9.00,NULL,3,0.00,20.00,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,60,'PER_PIECE',120,NULL,900,0,0),(79,'French Beans','vegetable','root',0.0900,0.0990,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'फ्रेंच बीन्स','/uploads/1784723042349-904468343.jpg',1.00,1.00,2.00,1.00,2.00,NULL,3,0.00,10.00,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_PIECE',6,NULL,30,0,0),(80,'Green Peas','vegetable','root',0.0450,0.0250,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'हरे मटर','/uploads/1784636732935-323590001.png',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(81,'Red Bell Pepper','vegetable','root',0.1750,0.1925,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लाल शिमला मिर्च ','/uploads/1784723134952-815552526.jpg',2.00,1.00,1.00,2.00,1.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(82,'Lettuce','vegetable','root',0.2400,0.2640,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लेट्यूस','/uploads/1784723292689-922908056.jpg',2.00,2.00,2.00,2.00,2.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(83,'Mustard Leaves','vegetable','root',0.0550,0.0250,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'सरसों की पत्तियाँ','/uploads/1784638044881-297906516.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,-54.50,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,20,100,'PER_25G',NULL,10,120,0,0),(84,'Radish','vegetable','root',0.0350,0.0385,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'मूली ','/uploads/1784723424955-102252037.jpg',2.00,1.00,2.00,1.00,2.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(85,'Spinach','vegetable','root',0.0400,0.0500,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'पालक ','/uploads/1784636869215-204448960.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,25.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',NULL,120,900,0,0),(86,'Sweet Potato','vegetable','root',0.0450,0.0540,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'शकरकंद','/uploads/1784723422402-715779842.jpg',5.00,6.00,7.00,8.00,9.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(87,'Turnip','vegetable','root',0.0400,0.0250,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'शलजम','/uploads/1784638496784-241262752.png',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,-37.50,0.00,500.00,0.00,0.00,1,2.00,0.00,0.00,0.00,5.00,1,0.00,0.00,20,25,'PER_PIECE',1,NULL,30,2,1),(88,'Yellow Bell Pepper','vegetable','root',0.1750,0.1925,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'पीली शिमला मिर्च','/uploads/1784723521003-697154656.jpg',2.00,1.00,1.00,1.00,2.00,NULL,3,0.00,10.00,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,12,15,'PER_PIECE',2,NULL,10,2,1),(89,'Red Leafy Vegetable (Lal Bhaji)','vegetable','root',0.0400,0.0440,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लाल चौलाई भाजी','/uploads/1784723721304-370697749.jpg',1.00,1.00,1.00,1.00,1.00,NULL,3,0.00,10.00,0.00,500.00,0.00,0.00,1,2.00,0.00,0.00,0.00,5.00,1,0.00,0.00,15,10,'PER_PIECE',1,NULL,10,2,1),(90,'Bathua Leaves','vegetable','root',0.0350,0.0420,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'बथुआ के पत्ते','/uploads/1784723573393-386399602.jpg',5.00,6.00,7.00,8.00,9.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(91,'Lima Beans','vegetable','root',0.0350,0.0420,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लाइमा बीन्स','/uploads/1784723659251-151936884.jpg',5.00,6.00,7.00,8.00,9.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(92,'Lima Beans Broad','vegetable','root',0.0350,0.0420,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लीमा बीन्स ब्रॉड','/uploads/1784723778067-564436663.jpg',5.00,6.00,7.00,8.00,9.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(93,'Ash Gourd','vegetable','root',0.1000,0.0400,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,' सफेद कद्दू','/uploads/1784636733271-284327672.png',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(94,'Turmeric','vegetable','root',0.1200,0.0250,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'हल्दी','/uploads/1784638365944-937081318.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(95,'Hill Lemon','vegetable','root',0.1100,0.0100,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'पहाड़ी नींबू','/uploads/1784723873553-707647262.jpg',3.00,5.00,3.00,4.00,1.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(96,'Red Chillies','vegetable','root',0.0900,0.0250,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'लाल मिर्च','/uploads/1784639633459-222820977.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,-72.20,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,20,25,'PER_PIECE',1,NULL,10,2,1),(97,'Sweet Neem Leaves','vegetable','root',0.2500,0.3000,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'मीठी नीम की पत्तियाँ','/uploads/1784723242960-849089064.webp',5.00,6.00,7.00,8.00,9.00,NULL,3,0.00,20.00,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,20,10,'PER_25G',NULL,3,15,3,1),(98,'Raw Banana','vegetable','root',50.0000,58.0000,'Dozen','active','2026-06-24 13:26:25',0.00,0.00,0.00,'कच्चा केला','/uploads/1784635312939-33111683.jpg',0.00,0.00,0.00,0.00,0.00,NULL,6,0.00,16.00,0.00,500.00,0.00,0.00,1,2.00,0.00,0.00,0.00,5.00,1,0.00,0.00,20,30,'PER_PIECE',1,NULL,10,1,1),(99,'Raw Papaya','vegetable','root',0.0550,0.0660,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'कच्चा पपीता','/uploads/1784723126771-274698546.jpg',5.00,6.00,7.00,8.00,9.00,NULL,3,0.00,20.00,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,50,80,'PER_PIECE',1,NULL,30,1,1),(100,'KATHAL ( JACKFRUIT)','vegetable','root',0.0500,0.0980,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'कटहल','/uploads/1784639256076-324370940.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,96.00,0.00,500.00,2.00,1.00,1,1.00,0.00,3.00,0.50,5.00,1,0.00,0.00,100,120,'PER_PIECE',150,NULL,200,3,2),(101,'Spring Onion ','vegetable','root',0.0800,0.0380,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'हरी प्याज ','/uploads/1784640034307-102862302.jpg',0.00,0.00,0.00,0.00,0.00,NULL,3,0.00,-52.50,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,100,120,'PER_PIECE',2,NULL,100,3,2),(102,'Spring GARLIC','exotic','root',0.0190,0.0200,'gm','active','2026-06-24 13:26:25',0.00,0.00,0.00,'वसंत लहसुन','/uploads/1784637750439-902859653.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(103,'Alkaline Health Water (Glass)','water','Glass',20.0000,25.0000,'Litter','active','2026-06-24 13:28:51',0.00,0.00,0.00,'एल्कलाइन हेल्थ वाटर गिलास','/uploads/1784723940425-95242767.jpg',5.00,6.00,7.00,8.00,9.00,'9PH Water',NULL,0.00,25.00,1.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(104,'Alkaline Health Water (Plastic)','water','plastic',10.0000,15.0000,'piece','active','2026-06-24 13:28:51',0.00,0.00,0.00,'एल्कलाइन हेल्थ वाटर प्लास्टिक','/uploads/1784724001288-823371947.avif',5.00,6.00,7.00,8.00,9.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(105,'Miracle Water (Glass)','water','glass',25.0000,30.0000,'piece','active','2026-06-24 13:28:51',0.00,0.00,0.00,'मिरेकल वाटर गिलास ','/uploads/1784724007148-104018666.jpg',6.00,2.00,2.00,1.00,1.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(106,'Miracle Water (Plastic)','water','plastic',20.0000,25.0000,'piece','active','2026-06-24 13:28:51',0.00,0.00,0.00,'मिरेकल वाटर प्लास्टिक','/uploads/1784724117359-970486425.jpg',6.00,5.00,4.00,2.00,1.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(107,'Mango','fruit','leafy',0.1000,0.1180,'gm','active','2026-07-09 09:56:39',0.00,0.00,0.00,'आम','/uploads/1784637940321-405471950.jpg',0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_logs`
--

DROP TABLE IF EXISTS `purchase_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quantity` decimal(12,2) NOT NULL,
  `purchase_price_per_kg` decimal(10,2) NOT NULL,
  `selling_price_per_kg` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL,
  `purchase_date` datetime DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `purchase_logs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_logs`
--

LOCK TABLES `purchase_logs` WRITE;
/*!40000 ALTER TABLE `purchase_logs` DISABLE KEYS */;
INSERT INTO `purchase_logs` VALUES (1,1000.00,10.00,0.00,10.00,'2026-09-07 12:38:51',18),(2,100.00,100.00,0.00,10.00,'2026-09-07 12:38:59',26),(3,1000.00,100.00,0.00,100.00,'2026-09-07 12:42:56',19);
/*!40000 ALTER TABLE `purchase_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referral_logs`
--

DROP TABLE IF EXISTS `referral_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referral_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referrer_id` int DEFAULT NULL,
  `referred_user_id` int NOT NULL,
  `is_salesman` tinyint(1) DEFAULT '0',
  `awarded_free_serving` tinyint(1) DEFAULT '0',
  `subscription_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referral_logs`
--

LOCK TABLES `referral_logs` WRITE;
/*!40000 ALTER TABLE `referral_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `referral_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `retail_order_items`
--

DROP TABLE IF EXISTS `retail_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `retail_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quantity` decimal(12,2) NOT NULL,
  `price_per_unit` decimal(10,4) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `order_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `packed_qty` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `retail_order_items_ibfk_59` FOREIGN KEY (`order_id`) REFERENCES `retail_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `retail_order_items_ibfk_60` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `retail_order_items`
--

LOCK TABLES `retail_order_items` WRITE;
/*!40000 ALTER TABLE `retail_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `retail_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `retail_orders`
--

DROP TABLE IF EXISTS `retail_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `retail_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `total_amount` decimal(10,2) NOT NULL,
  `delivery_charge` decimal(10,2) DEFAULT '30.00',
  `payment_method` enum('cod','phonepe') NOT NULL,
  `payment_status` enum('pending','success','failed') DEFAULT 'pending',
  `delivery_date` date NOT NULL,
  `delivery_status` enum('pending','ready_for_delivery','delivered','cancelled') DEFAULT 'pending',
  `phonepe_txn_id` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  `address_id` int DEFAULT NULL,
  `batch_id` int DEFAULT NULL,
  `delivery_boy_id` int DEFAULT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `address_id` (`address_id`),
  KEY `batch_id` (`batch_id`),
  KEY `delivery_boy_id` (`delivery_boy_id`),
  CONSTRAINT `retail_orders_ibfk_60` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `retail_orders_ibfk_61` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `retail_orders_ibfk_62` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `retail_orders_ibfk_63` FOREIGN KEY (`delivery_boy_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `retail_orders`
--

LOCK TABLES `retail_orders` WRITE;
/*!40000 ALTER TABLE `retail_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `retail_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `returned_product_logs`
--

DROP TABLE IF EXISTS `returned_product_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `returned_product_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `returned_date` date NOT NULL,
  `returned_qty` decimal(10,2) NOT NULL,
  `next_schedule_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `returned_product_logs_ibfk_5` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `returned_product_logs_ibfk_6` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `returned_product_logs`
--

LOCK TABLES `returned_product_logs` WRITE;
/*!40000 ALTER TABLE `returned_product_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `returned_product_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_seasonal_selections`
--

DROP TABLE IF EXISTS `schedule_seasonal_selections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_seasonal_selections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qty_gm` decimal(10,2) DEFAULT NULL,
  `is_auto` tinyint(1) DEFAULT '0',
  `schedule_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `schedule_seasonal_selections_ibfk_61` FOREIGN KEY (`schedule_id`) REFERENCES `delivery_schedule` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `schedule_seasonal_selections_ibfk_62` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_seasonal_selections`
--

LOCK TABLES `schedule_seasonal_selections` WRITE;
/*!40000 ALTER TABLE `schedule_seasonal_selections` DISABLE KEYS */;
INSERT INTO `schedule_seasonal_selections` VALUES (1,400.00,0,6,23),(2,250.00,0,6,24),(3,750.00,0,6,25),(4,1050.00,0,6,18),(5,1000.00,0,6,19),(6,100.00,0,6,26);
/*!40000 ALTER TABLE `schedule_seasonal_selections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `split_worker_assignments`
--

DROP TABLE IF EXISTS `split_worker_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `split_worker_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `split_id` int NOT NULL,
  `worker_id` int NOT NULL,
  `joined_at` datetime NOT NULL,
  `left_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `split_id` (`split_id`),
  KEY `worker_id` (`worker_id`),
  CONSTRAINT `split_worker_assignments_ibfk_1` FOREIGN KEY (`split_id`) REFERENCES `batch_splits` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `split_worker_assignments_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `split_worker_assignments`
--

LOCK TABLES `split_worker_assignments` WRITE;
/*!40000 ALTER TABLE `split_worker_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `split_worker_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sub_categories`
--

DROP TABLE IF EXISTS `sub_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sub_categories`
--

LOCK TABLES `sub_categories` WRITE;
/*!40000 ALTER TABLE `sub_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `sub_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_items`
--

DROP TABLE IF EXISTS `subscription_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qty_gm` decimal(10,2) DEFAULT NULL,
  `is_fixed` tinyint(1) DEFAULT NULL,
  `is_seasonal` tinyint(1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `subscription_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscription_id` (`subscription_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `subscription_items_ibfk_61` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `subscription_items_ibfk_62` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_items`
--

LOCK TABLES `subscription_items` WRITE;
/*!40000 ALTER TABLE `subscription_items` DISABLE KEYS */;
INSERT INTO `subscription_items` VALUES (1,1000.00,1,0,1,4,18),(2,1000.00,1,0,1,4,19),(3,100.00,1,0,1,4,26),(4,1000.00,1,0,1,5,18),(5,1000.00,1,0,1,5,19),(6,100.00,1,0,1,5,26);
/*!40000 ALTER TABLE `subscription_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','paused','completed','cancelled') DEFAULT NULL,
  `type` enum('monthly','yearly') DEFAULT NULL,
  `yearly_amount_paid` decimal(10,2) DEFAULT NULL,
  `services_completed` int DEFAULT '0',
  `total_services` int DEFAULT NULL,
  `address_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  `package_id` int DEFAULT NULL,
  `renewal_count` int DEFAULT '1',
  `locked_price` decimal(10,2) DEFAULT NULL,
  `postpaid_serving_given` tinyint(1) DEFAULT '0',
  `batch_id` int DEFAULT NULL,
  `free_servings_awarded` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `subscriptions_batch_id_foreign_idx` (`batch_id`),
  KEY `address_id` (`address_id`),
  KEY `user_id` (`user_id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `subscriptions_batch_id_foreign_idx` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_91` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_92` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_93` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES (4,'2026-09-08','2026-10-07','active','monthly',NULL,0,5,3,'2026-09-07 12:31:55',89,1,1,1500.00,0,1,0),(5,'2026-09-08','2026-10-07','active','monthly',NULL,0,5,2,'2026-09-07 12:32:44',91,1,1,1500.00,0,1,0);
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_worker_assignments`
--

DROP TABLE IF EXISTS `task_worker_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_worker_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `worker_id` int NOT NULL,
  `joined_at` datetime NOT NULL,
  `left_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `worker_id` (`worker_id`),
  CONSTRAINT `task_worker_assignments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `batch_product_tasks` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `task_worker_assignments_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_worker_assignments`
--

LOCK TABLES `task_worker_assignments` WRITE;
/*!40000 ALTER TABLE `task_worker_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_worker_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `abbreviation` varchar(20) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `units`
--

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
INSERT INTO `units` VALUES (3,'gm','Gram','active','2026-08-01 11:31:43','2026-08-01 11:31:43'),(4,'LTR','Litter','active','2026-08-06 10:35:58','2026-08-06 10:35:58'),(5,'Kilogram','KG','active','2026-08-10 10:17:33','2026-08-10 10:17:33'),(6,'Dozen','Dozen','active','2026-08-10 10:17:42','2026-08-10 10:17:42'),(7,'Pieces','PC','active','2026-08-10 10:17:50','2026-08-10 10:17:50'),(8,'Packets','Pack','active','2026-08-10 10:18:04','2026-08-10 10:18:04');
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `actual_password` varchar(255) DEFAULT NULL,
  `role` enum('admin','user','delivery','salesman') DEFAULT 'user',
  `wallet_balance` decimal(10,2) DEFAULT '0.00',
  `due_amount` decimal(10,2) DEFAULT '0.00',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `otp` varchar(6) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `postpaid_debt` decimal(10,2) DEFAULT '0.00',
  `delivery_zones` json DEFAULT NULL,
  `last_assigned_at` datetime DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `disliked_products` json DEFAULT NULL,
  `delivery_profile` json DEFAULT NULL,
  `total_free_servings` int DEFAULT '0',
  `referral_code` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone_2` (`phone`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `phone_3` (`phone`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `phone_4` (`phone`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `phone_5` (`phone`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `phone_6` (`phone`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `phone_7` (`phone`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `phone_8` (`phone`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `phone_9` (`phone`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `phone_10` (`phone`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `phone_11` (`phone`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `phone_12` (`phone`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `phone_13` (`phone`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `phone_14` (`phone`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `phone_15` (`phone`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `phone_16` (`phone`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `phone_17` (`phone`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `phone_18` (`phone`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `phone_19` (`phone`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `phone_20` (`phone`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `phone_21` (`phone`),
  UNIQUE KEY `email_21` (`email`),
  UNIQUE KEY `phone_22` (`phone`),
  UNIQUE KEY `email_22` (`email`),
  UNIQUE KEY `phone_23` (`phone`),
  UNIQUE KEY `email_23` (`email`),
  UNIQUE KEY `phone_24` (`phone`),
  UNIQUE KEY `email_24` (`email`),
  UNIQUE KEY `phone_25` (`phone`),
  UNIQUE KEY `email_25` (`email`),
  UNIQUE KEY `phone_26` (`phone`),
  UNIQUE KEY `email_26` (`email`),
  UNIQUE KEY `phone_27` (`phone`),
  UNIQUE KEY `email_27` (`email`),
  UNIQUE KEY `phone_28` (`phone`),
  UNIQUE KEY `email_28` (`email`),
  UNIQUE KEY `phone_29` (`phone`),
  UNIQUE KEY `email_29` (`email`),
  UNIQUE KEY `phone_30` (`phone`),
  UNIQUE KEY `email_30` (`email`),
  UNIQUE KEY `phone_31` (`phone`),
  UNIQUE KEY `email_31` (`email`),
  UNIQUE KEY `phone_32` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','9000000001','admin@freshbox.com','$2b$10$irOyaNZUngx5sRq1Ezrl2eJcSIJoMqxe2F3FAMG3cf5vmWJs.IXrS','Admin@123','admin',0.00,0.00,'active','2026-06-18 12:46:19','2026-06-18 12:46:19',NULL,NULL,1,0.00,NULL,NULL,NULL,NULL,NULL,0,NULL),(89,'AYAN RATHOUR','7879110142','mohammadayan2210@gmail.com','$2b$10$zuzr8YGRclCmQC704ZDNTeN/IJSQsKD9wLFP.CwKxC/mqIcTBeBzy','123456','user',1500.00,0.00,'active','2026-09-06 13:28:59','2026-09-07 12:31:55',NULL,NULL,1,0.00,NULL,NULL,NULL,'[]',NULL,0,NULL),(90,'sameer','6269979013','sameer@gmail.com','$2b$10$bQD3WxerODHhJZhe48UhTuQr6ulH4S3Up0JyvmfphtPehaRlLleFa','123456','delivery',0.00,0.00,'active','2026-09-06 13:29:38','2026-09-06 13:29:38',NULL,NULL,1,0.00,'[]',NULL,NULL,'[]',NULL,0,NULL),(91,'Ankit','9074146871','ankitraghu11111@gmail.com','$2b$10$sLYTh5BewmJL6qlWbzrB6.2Z2sJAAvJ3N4WaNKsBpK2CtrK6ytXJi','12345678','user',1500.00,0.00,'active','2026-09-07 11:06:15','2026-09-07 12:32:44',NULL,NULL,1,0.00,NULL,NULL,'male','[]',NULL,0,'9K3TMOX3DKOY'),(92,'Pranshu Mishra','9179289234','pranshumishra1020@gmail.com','$2b$10$T.6W9GbWjTvv/wwZBEpzGuwHrLxSdxKAh0cJKug7mHoh85DEt.5gK','12345678','user',0.00,0.00,'active','2026-09-07 12:34:01','2026-09-07 12:34:06',NULL,NULL,1,0.00,NULL,NULL,'male','[]',NULL,0,'H1QW4376LSHE');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) DEFAULT NULL,
  `type` enum('credit','debit') DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
INSERT INTO `wallet_transactions` VALUES (4,1500.00,'credit','Monthly package purchase: Senior (PhonePe)',NULL,'2026-09-07 12:31:55',89,NULL),(5,1500.00,'credit','Monthly package purchase: Senior (PhonePe)',NULL,'2026-09-07 12:32:44',91,NULL);
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `waste_logs`
--

DROP TABLE IF EXISTS `waste_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `waste_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quantity` decimal(10,2) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `waste_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `product_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `waste_logs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `waste_logs`
--

LOCK TABLES `waste_logs` WRITE;
/*!40000 ALTER TABLE `waste_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `waste_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `water_subscriptions`
--

DROP TABLE IF EXISTS `water_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `water_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `water_type` enum('health','miracle') DEFAULT NULL,
  `container` enum('glass','plastic') DEFAULT NULL,
  `frequency` enum('daily','alternate') DEFAULT NULL,
  `price_per_bottle` decimal(10,2) DEFAULT NULL,
  `status` enum('active','paused','completed','cancelled') DEFAULT 'active',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `type` enum('monthly','yearly') DEFAULT 'monthly',
  `yearly_amount_paid` decimal(10,2) DEFAULT NULL,
  `services_completed` int DEFAULT '0',
  `total_services` int DEFAULT '0',
  `address_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  `batch_id` int DEFAULT NULL,
  `capacity_liters` decimal(10,2) DEFAULT '2.00',
  PRIMARY KEY (`id`),
  KEY `water_subscriptions_batch_id_foreign_idx` (`batch_id`),
  KEY `address_id` (`address_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `water_subscriptions_batch_id_foreign_idx` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `water_subscriptions_ibfk_61` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `water_subscriptions_ibfk_62` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `water_subscriptions`
--

LOCK TABLES `water_subscriptions` WRITE;
/*!40000 ALTER TABLE `water_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `water_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `worker_attendances`
--

DROP TABLE IF EXISTS `worker_attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `worker_attendances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_id` int NOT NULL,
  `date` date NOT NULL,
  `checked_in_at` datetime NOT NULL,
  `current_status` enum('inactive','idle','working') DEFAULT 'inactive',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `worker_id` (`worker_id`),
  CONSTRAINT `worker_attendances_ibfk_1` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `worker_attendances`
--

LOCK TABLES `worker_attendances` WRITE;
/*!40000 ALTER TABLE `worker_attendances` DISABLE KEYS */;
INSERT INTO `worker_attendances` VALUES (1,90,'2026-09-07','2026-09-07 07:15:22','inactive','2026-09-07 07:15:22','2026-09-07 07:15:22');
/*!40000 ALTER TABLE `worker_attendances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `zones`
--

DROP TABLE IF EXISTS `zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `zones`
--

LOCK TABLES `zones` WRITE;
/*!40000 ALTER TABLE `zones` DISABLE KEYS */;
INSERT INTO `zones` VALUES (1,'Zone1','Arera colony','active','2026-09-07 12:31:00','2026-09-07 12:31:00');
/*!40000 ALTER TABLE `zones` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-07 18:16:57
