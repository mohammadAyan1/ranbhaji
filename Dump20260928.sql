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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '12e71f24-9474-11f1-843e-fa299255a22b:1-115546,
8e0a9de8-786d-11f1-af9f-36d9b2db8e02:1-2380,
937834f0-4092-11f1-b16d-e29b503da54d:1-6237,
9ccfa3c2-ba6f-11f1-8db5-5aa61d629c38:1-4259,
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES (1,'A-402, DRISTI ENCLAVE , ROHIT NAGAR ','BHOPAL','462039',NULL,1,105,23.18060160,77.43398850,NULL),(2,'A-303, SHALIMAR REGENCY, G2 GULMOHAR COLONY','BHOPAL','462026',NULL,1,110,23.18992250,77.43505300,NULL),(3,'H-371, GAUTHAM NAGAR','BHOPAL','462026','NEAR MADHAV CLINIC',1,111,23.23969490,77.43820850,NULL),(4,'J2-104, CANAL KINGSHIP, SALAIYA ','BHOPAL','462039',NULL,1,112,23.15900900,77.44292170,NULL),(5,'Shree Golden city, Jatkhedi','Bhopal','462026',NULL,0,113,23.16901500,77.47131290,NULL),(6,'39A, Shree Golden city phase 1, Jatkhedi','Bhopal','462026',NULL,1,113,NULL,NULL,NULL),(7,'AYODHYA NAGAR\nHIG87','Bhopal','462022','80 feet road',1,104,NULL,NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_logs`
--

LOCK TABLES `attendance_logs` WRITE;
/*!40000 ALTER TABLE `attendance_logs` DISABLE KEYS */;
INSERT INTO `attendance_logs` VALUES (1,'2026-09-28','2026-09-28 04:36:47','2026-09-28 04:36:47','2026-09-28 04:36:47',115),(2,'2026-09-28','2026-09-28 05:05:50','2026-09-28 05:05:50','2026-09-28 05:05:50',118),(3,'2026-09-28','2026-09-28 05:06:23','2026-09-28 05:06:24','2026-09-28 05:06:24',114),(4,'2026-09-28','2026-09-28 05:06:28','2026-09-28 05:06:28','2026-09-28 05:06:28',116),(5,'2026-09-28','2026-09-28 08:48:53','2026-09-28 08:48:53','2026-09-28 08:48:53',104);
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
) ENGINE=InnoDB AUTO_INCREMENT=2865 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_product_demands`
--

LOCK TABLES `batch_product_demands` WRITE;
/*!40000 ALTER TABLE `batch_product_demands` DISABLE KEYS */;
INSERT INTO `batch_product_demands` VALUES (2853,1,1,1000.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2854,1,2,1000.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2855,1,4,250.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2856,1,5,250.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2857,1,8,750.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2858,1,12,250.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2859,1,17,1000.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2860,1,18,250.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2861,1,39,500.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2862,1,54,750.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2863,1,60,750.00,'2026-09-28 17:58:58','2026-09-28 17:58:58'),(2864,1,77,400.00,'2026-09-28 17:58:58','2026-09-28 17:58:58');
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
) ENGINE=InnoDB AUTO_INCREMENT=186 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_product_tasks`
--

LOCK TABLES `batch_product_tasks` WRITE;
/*!40000 ALTER TABLE `batch_product_tasks` DISABLE KEYS */;
INSERT INTO `batch_product_tasks` VALUES (172,1,5,'WEIGHING',250.00,'DONE',30,0,'2026-09-28 17:28:57',NULL,'2026-09-28 17:29:42','2026-09-28 17:29:29','2026-09-28 17:28:50','2026-09-28 17:29:42',NULL),(173,1,5,'SOAKING',250.00,'DONE',720,0,'2026-09-28 17:32:20',NULL,'2026-09-28 17:47:18','2026-09-28 17:44:21','2026-09-28 17:29:42','2026-09-28 17:47:18',NULL),(174,1,54,'WEIGHING',750.00,'DONE',30,0,'2026-09-28 17:32:35',NULL,'2026-09-28 17:36:11','2026-09-28 17:33:06','2026-09-28 17:32:23','2026-09-28 17:36:11',NULL),(175,1,54,'SOAKING',750.00,'DONE',60,0,'2026-09-28 17:36:17',NULL,'2026-09-28 17:38:03','2026-09-28 17:37:19','2026-09-28 17:36:11','2026-09-28 17:38:03',NULL),(176,1,60,'WEIGHING',750.00,'DONE',30,0,'2026-09-28 17:38:57',NULL,'2026-09-28 17:38:59',NULL,'2026-09-28 17:36:42','2026-09-28 17:38:59',NULL),(177,1,54,'CUTTING',750.00,'DONE',1800,0,'2026-09-28 17:39:09',NULL,'2026-09-28 17:39:11',NULL,'2026-09-28 17:38:03','2026-09-28 17:39:11',NULL),(178,1,60,'SOAKING',750.00,'DONE',30,0,'2026-09-28 17:39:01',NULL,'2026-09-28 17:49:16','2026-09-28 17:39:31','2026-09-28 17:38:59','2026-09-28 17:49:16',NULL),(179,1,54,'DRYING',750.00,'DONE',5,0,'2026-09-28 17:50:51',NULL,'2026-09-28 17:51:13','2026-09-28 17:50:56','2026-09-28 17:39:11','2026-09-28 17:51:13','machine'),(180,1,5,'CUTTING',250.00,'DONE',1200,0,'2026-09-28 17:57:46',NULL,'2026-09-28 17:57:47',NULL,'2026-09-28 17:47:18','2026-09-28 17:57:47',NULL),(181,1,60,'CUTTING',750.00,'DONE',1800,0,'2026-09-28 17:50:36',NULL,'2026-09-28 17:50:38',NULL,'2026-09-28 17:49:16','2026-09-28 17:50:38',NULL),(182,1,60,'DRYING',750.00,'DONE',0,0,'2026-09-28 17:50:46',NULL,'2026-09-28 17:50:47',NULL,'2026-09-28 17:50:38','2026-09-28 17:50:47','piece'),(183,1,5,'DRYING',250.00,'DONE',5,0,'2026-09-28 17:57:51',NULL,'2026-09-28 17:58:07','2026-09-28 17:57:56','2026-09-28 17:57:47','2026-09-28 17:58:07','machine'),(184,1,8,'WEIGHING',750.00,'DONE',30,0,'2026-09-28 17:58:11',NULL,'2026-09-28 17:58:57','2026-09-28 17:58:41','2026-09-28 17:58:08','2026-09-28 17:58:57',NULL),(185,1,8,'SOAKING',750.00,'NOT_STARTED',720,720,NULL,NULL,NULL,NULL,'2026-09-28 17:58:58','2026-09-28 17:58:58',NULL);
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
INSERT INTO `batches` VALUES (1,'10AM-1PM','active',0,'2026-09-27 12:45:46','2026-09-27 12:45:46');
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
) ENGINE=InnoDB AUTO_INCREMENT=249 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calculator_draft_items`
--

LOCK TABLES `calculator_draft_items` WRITE;
/*!40000 ALTER TABLE `calculator_draft_items` DISABLE KEYS */;
INSERT INTO `calculator_draft_items` VALUES (1,500.00,1,0,1,1),(2,500.00,1,0,1,2),(3,350.00,1,0,1,17),(4,200.00,1,0,1,16),(5,100.00,1,0,1,3),(6,100.00,1,0,1,4),(7,50.00,1,0,1,5),(8,50.00,1,0,1,56),(9,50.00,1,0,1,18),(10,0.00,0,1,1,6),(11,0.00,0,1,1,10),(12,0.00,0,1,1,9),(13,0.00,0,1,1,8),(14,0.00,0,1,1,7),(15,0.00,0,1,1,11),(16,0.00,0,1,1,12),(17,0.00,0,1,1,14),(18,0.00,0,1,1,15),(19,0.00,0,1,1,21),(20,0.00,0,1,1,22),(21,0.00,0,1,1,23),(22,0.00,0,1,1,25),(23,0.00,0,1,1,30),(24,0.00,0,1,1,29),(25,0.00,0,1,1,28),(26,0.00,0,1,1,27),(27,0.00,0,1,1,26),(28,0.00,0,1,1,31),(29,0.00,0,1,1,34),(30,0.00,0,1,1,35),(31,0.00,0,1,1,40),(32,0.00,0,1,1,39),(33,0.00,0,1,1,44),(34,0.00,0,1,1,45),(35,0.00,0,1,1,43),(36,0.00,0,1,1,37),(37,0.00,0,1,1,41),(38,0.00,0,1,1,46),(39,0.00,0,1,1,47),(40,0.00,0,1,1,54),(41,0.00,0,1,1,55),(42,0.00,0,1,1,57),(43,0.00,0,1,1,58),(44,0.00,0,1,1,60),(45,0.00,0,1,1,70),(46,250.00,1,0,2,1),(47,250.00,1,0,2,2),(48,150.00,1,0,2,17),(49,120.00,1,0,2,16),(50,60.00,1,0,2,3),(51,60.00,1,0,2,4),(52,50.00,1,0,2,5),(53,50.00,1,0,2,56),(54,50.00,1,0,2,18),(55,0.00,0,1,2,6),(56,0.00,0,1,2,10),(57,0.00,0,1,2,9),(58,0.00,0,1,2,8),(59,0.00,0,1,2,7),(60,0.00,0,1,2,11),(61,0.00,0,1,2,12),(62,0.00,0,1,2,14),(63,0.00,0,1,2,15),(64,0.00,0,1,2,21),(65,0.00,0,1,2,22),(66,0.00,0,1,2,23),(67,0.00,0,1,2,25),(68,0.00,0,1,2,30),(69,0.00,0,1,2,29),(70,0.00,0,1,2,28),(71,0.00,0,1,2,27),(72,0.00,0,1,2,26),(73,0.00,0,1,2,31),(74,0.00,0,1,2,34),(75,0.00,0,1,2,35),(76,0.00,0,1,2,40),(77,0.00,0,1,2,39),(78,0.00,0,1,2,44),(79,0.00,0,1,2,45),(80,0.00,0,1,2,43),(81,0.00,0,1,2,37),(82,0.00,0,1,2,41),(83,0.00,0,1,2,46),(84,0.00,0,1,2,47),(85,0.00,0,1,2,54),(86,0.00,0,1,2,55),(87,0.00,0,1,2,57),(88,0.00,0,1,2,58),(89,0.00,0,1,2,60),(90,0.00,0,1,2,70),(136,500.00,1,0,4,1),(137,500.00,1,0,4,2),(138,350.00,1,0,4,17),(139,200.00,1,0,4,16),(140,100.00,1,0,4,3),(141,100.00,1,0,4,4),(142,50.00,1,0,4,5),(143,50.00,1,0,4,56),(144,50.00,1,0,4,18),(145,0.00,0,1,4,6),(146,0.00,0,1,4,10),(147,0.00,0,1,4,9),(148,0.00,0,1,4,8),(149,0.00,0,1,4,7),(150,0.00,0,1,4,11),(151,0.00,0,1,4,12),(152,0.00,0,1,4,14),(153,0.00,0,1,4,15),(154,0.00,0,1,4,21),(155,0.00,0,1,4,22),(156,0.00,0,1,4,23),(157,0.00,0,1,4,25),(158,0.00,0,1,4,30),(159,0.00,0,1,4,29),(160,0.00,0,1,4,28),(161,0.00,0,1,4,27),(162,0.00,0,1,4,26),(163,0.00,0,1,4,31),(164,0.00,0,1,4,34),(165,0.00,0,1,4,35),(166,0.00,0,1,4,40),(167,0.00,0,1,4,39),(168,0.00,0,1,4,44),(169,0.00,0,1,4,45),(170,0.00,0,1,4,43),(171,0.00,0,1,4,37),(172,0.00,0,1,4,41),(173,0.00,0,1,4,46),(174,0.00,0,1,4,47),(175,0.00,0,1,4,54),(176,0.00,0,1,4,55),(177,0.00,0,1,4,57),(178,0.00,0,1,4,58),(179,0.00,0,1,4,60),(180,0.00,0,1,4,70),(181,250.00,1,0,3,1),(182,250.00,1,0,3,2),(183,150.00,1,0,3,17),(184,120.00,1,0,3,16),(185,60.00,1,0,3,3),(186,60.00,1,0,3,4),(187,50.00,1,0,3,5),(188,50.00,1,0,3,56),(189,50.00,1,0,3,18),(190,0.00,0,1,3,6),(191,0.00,0,1,3,10),(192,0.00,0,1,3,9),(193,0.00,0,1,3,8),(194,0.00,0,1,3,7),(195,0.00,0,1,3,11),(196,0.00,0,1,3,12),(197,0.00,0,1,3,14),(198,0.00,0,1,3,15),(199,0.00,0,1,3,21),(200,0.00,0,1,3,22),(201,0.00,0,1,3,23),(202,0.00,0,1,3,25),(203,0.00,0,1,3,30),(204,0.00,0,1,3,29),(205,0.00,0,1,3,28),(206,0.00,0,1,3,27),(207,0.00,0,1,3,26),(208,0.00,0,1,3,31),(209,0.00,0,1,3,34),(210,0.00,0,1,3,35),(211,0.00,0,1,3,40),(212,0.00,0,1,3,39),(213,0.00,0,1,3,44),(214,0.00,0,1,3,45),(215,0.00,0,1,3,43),(216,0.00,0,1,3,37),(217,0.00,0,1,3,41),(218,0.00,0,1,3,46),(219,0.00,0,1,3,47),(220,0.00,0,1,3,54),(221,0.00,0,1,3,55),(222,0.00,0,1,3,57),(223,0.00,0,1,3,58),(224,0.00,0,1,3,60),(225,0.00,0,1,3,70),(226,1000.00,1,0,5,1),(227,1000.00,1,0,5,2),(228,750.00,1,0,5,17),(229,180.00,1,0,5,3),(230,100.00,1,0,5,4),(231,100.00,1,0,5,5),(232,750.00,1,0,5,16),(233,50.00,1,0,5,18),(234,50.00,1,0,5,56),(235,0.00,0,1,5,21),(236,0.00,0,1,5,25),(237,0.00,0,1,5,26),(238,0.00,0,1,5,27),(239,0.00,0,1,5,28),(240,0.00,0,1,5,29),(241,0.00,0,1,5,30),(242,0.00,0,1,5,47),(243,0.00,0,1,5,43),(244,0.00,0,1,5,39),(245,0.00,0,1,5,37),(246,0.00,0,1,5,31),(247,0.00,0,1,5,54),(248,0.00,0,1,5,60);
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
  `num_persons_max` int DEFAULT NULL,
  `target_user_id` int DEFAULT NULL,
  `target_mobile_number` varchar(15) DEFAULT NULL,
  `calculation_mode` varchar(50) DEFAULT 'highest',
  `custom_price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calculator_drafts`
--

LOCK TABLES `calculator_drafts` WRITE;
/*!40000 ALTER TABLE `calculator_drafts` DISABLE KEYS */;
INSERT INTO `calculator_drafts` VALUES (1,'NANO PLAN ',99.87,6,2,1499.00,9,3,'2026-09-27 11:56:51','2026-09-27 11:56:51','[350, 450, 250]','standard',NULL,NULL,NULL,'highest',NULL),(2,'SENIORS PLAN ',100.00,5,1,749.00,9,2,'2026-09-27 12:01:08','2026-09-27 12:01:08','[350, 200]','standard',NULL,NULL,NULL,'highest',NULL),(3,'SENIORS-H PLAN ',140.05,5,1,899.00,9,2,'2026-09-27 12:06:14','2026-09-27 12:24:51','[350, 200]','standard',NULL,NULL,NULL,'highest',NULL),(4,'NANO PLAN MR S.S.SAXENA',33.33,9,2,1500.00,9,3,'2026-09-27 12:12:12','2026-09-27 12:12:12','[350, 450, 250]','custom',NULL,NULL,'9669098509','highest',NULL),(5,'PRATIKSHA',150.00,6,4,3235.18,9,6,'2026-09-28 11:18:52','2026-09-28 11:18:52','[250, 250, 250, 250, 250, 250]','custom',NULL,113,NULL,'average',NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Vegetable','Vegetable','active','2026-09-27 11:17:05','2026-09-27 11:17:05'),(2,'Exotic Vegetable','Exotic Vegetable','active','2026-09-27 11:17:09','2026-09-27 11:17:09'),(3,'FRUITS GEN','GENERAL CATEGORY FRUITS EASILY AVAILABLE','active','2026-09-27 15:03:15','2026-09-27 15:03:15'),(4,'FRUITS EXOTIC','IMPORTED OR RARE','active','2026-09-27 15:03:45','2026-09-27 15:03:45');
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
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_items`
--

LOCK TABLES `delivery_items` WRITE;
/*!40000 ALTER TABLE `delivery_items` DISABLE KEYS */;
INSERT INTO `delivery_items` VALUES (1,250.00,NULL,NULL,NULL,NULL,'none',1,12,250.00,'user',0),(2,450.00,NULL,NULL,NULL,NULL,'none',1,21,450.00,'user',0),(3,250.00,NULL,NULL,NULL,NULL,'none',1,28,250.00,'user',0),(4,250.00,NULL,NULL,NULL,NULL,'none',1,29,250.00,'user',0),(5,250.00,NULL,NULL,NULL,NULL,'none',1,37,250.00,'user',0),(6,250.00,NULL,NULL,NULL,NULL,'none',1,39,250.00,'user',0),(7,0.00,NULL,NULL,NULL,NULL,'none',1,1,0.00,'user',0),(8,500.00,NULL,NULL,NULL,NULL,'none',1,2,500.00,'user',0),(9,0.00,NULL,NULL,NULL,NULL,'none',1,3,0.00,'user',0),(10,0.00,NULL,NULL,NULL,NULL,'none',1,4,0.00,'user',0),(11,50.00,NULL,NULL,NULL,NULL,'none',1,5,50.00,'user',0),(12,200.00,NULL,NULL,NULL,NULL,'none',1,16,200.00,'user',0),(13,350.00,NULL,NULL,NULL,NULL,'none',1,17,350.00,'user',0),(14,50.00,NULL,NULL,NULL,NULL,'none',1,18,50.00,'user',0),(15,50.00,NULL,NULL,NULL,NULL,'none',1,56,50.00,'user',0),(16,450.00,NULL,NULL,NULL,NULL,'none',7,21,450.00,'user',0),(17,350.00,NULL,NULL,NULL,NULL,'none',7,27,350.00,'user',0),(18,0.00,NULL,NULL,NULL,NULL,'none',7,1,0.00,'user',0),(19,0.00,NULL,NULL,NULL,NULL,'none',7,2,0.00,'user',0),(20,100.00,NULL,NULL,NULL,NULL,'none',7,3,100.00,'user',0),(21,0.00,NULL,NULL,NULL,NULL,'none',7,4,0.00,'user',0),(22,100.00,NULL,NULL,NULL,NULL,'none',7,5,100.00,'user',0),(23,0.00,NULL,NULL,NULL,NULL,'none',7,16,0.00,'user',0),(24,500.00,NULL,NULL,NULL,NULL,'none',7,17,500.00,'user',0),(25,0.00,NULL,NULL,NULL,NULL,'none',7,18,0.00,'user',0),(26,50.00,NULL,NULL,NULL,NULL,'none',7,56,50.00,'user',0),(27,250.00,NULL,NULL,NULL,NULL,'none',16,15,250.00,'user',0),(28,250.00,NULL,NULL,NULL,NULL,'none',16,37,250.00,'user',0),(29,250.00,NULL,NULL,NULL,NULL,'none',16,39,250.00,'user',0),(30,250.00,NULL,NULL,NULL,NULL,'none',16,1,250.00,'user',0),(31,250.00,NULL,NULL,NULL,NULL,'none',16,2,250.00,'user',0),(32,60.00,NULL,NULL,NULL,NULL,'none',16,3,60.00,'user',0),(33,60.00,NULL,NULL,NULL,NULL,'none',16,4,60.00,'user',0),(34,50.00,NULL,NULL,NULL,NULL,'none',16,5,50.00,'user',0),(35,120.00,NULL,NULL,NULL,NULL,'none',16,16,120.00,'user',0),(36,150.00,NULL,NULL,NULL,NULL,'none',16,17,150.00,'user',0),(37,0.00,NULL,NULL,NULL,NULL,'none',16,18,0.00,'user',0),(38,50.00,NULL,NULL,NULL,NULL,'none',16,56,50.00,'user',0),(39,200.00,NULL,NULL,NULL,NULL,'none',21,12,200.00,'user',0),(40,348.00,NULL,NULL,NULL,NULL,'none',21,21,348.00,'user',0),(41,350.00,NULL,NULL,NULL,NULL,'none',21,27,350.00,'user',0),(42,200.00,NULL,NULL,NULL,NULL,'none',21,39,200.00,'user',0),(43,0.00,NULL,NULL,NULL,NULL,'none',21,1,0.00,'user',0),(44,0.00,NULL,NULL,NULL,NULL,'none',21,2,0.00,'user',0),(45,0.00,NULL,NULL,NULL,NULL,'none',21,3,0.00,'user',0),(46,0.00,NULL,NULL,NULL,NULL,'none',21,4,0.00,'user',0),(47,0.00,NULL,NULL,NULL,NULL,'none',21,5,0.00,'user',0),(48,0.00,NULL,NULL,NULL,NULL,'none',21,16,0.00,'user',0),(49,500.00,NULL,NULL,NULL,NULL,'none',21,17,500.00,'user',0),(50,50.00,NULL,NULL,NULL,NULL,'none',21,18,50.00,'user',0),(51,100.00,NULL,NULL,NULL,NULL,'none',21,56,100.00,'user',0),(52,0.00,NULL,NULL,NULL,NULL,'none',37,1,NULL,'user',0),(53,0.00,NULL,NULL,NULL,NULL,'none',37,3,NULL,'user',0),(54,0.00,NULL,NULL,NULL,NULL,'none',37,4,NULL,'user',0),(55,0.00,NULL,NULL,NULL,NULL,'none',38,1,NULL,'user',0),(56,0.00,NULL,NULL,NULL,NULL,'none',38,2,NULL,'user',0),(57,0.00,NULL,NULL,NULL,NULL,'none',38,4,NULL,'user',0),(58,0.00,NULL,NULL,NULL,NULL,'none',38,16,NULL,'user',0),(59,0.00,NULL,NULL,NULL,NULL,'none',38,18,NULL,'user',0),(60,0.00,NULL,NULL,NULL,NULL,'none',39,18,NULL,'user',0),(61,0.00,NULL,NULL,NULL,NULL,'none',40,1,NULL,'user',0),(62,0.00,NULL,NULL,NULL,NULL,'none',40,2,NULL,'user',0),(63,0.00,NULL,NULL,NULL,NULL,'none',40,3,NULL,'user',0),(64,0.00,NULL,NULL,NULL,NULL,'none',40,4,NULL,'user',0),(65,0.00,NULL,NULL,NULL,NULL,'none',40,5,NULL,'user',0),(66,0.00,NULL,NULL,NULL,NULL,'none',40,16,NULL,'user',0),(67,500.00,NULL,NULL,NULL,NULL,'none',2,1,NULL,'user',0),(68,500.00,NULL,NULL,NULL,NULL,'none',2,2,NULL,'user',0),(69,350.00,NULL,NULL,NULL,NULL,'none',2,17,NULL,'user',0),(70,200.00,NULL,NULL,NULL,NULL,'none',2,16,NULL,'user',0),(71,100.00,NULL,NULL,NULL,NULL,'none',2,3,NULL,'user',0),(72,100.00,NULL,NULL,NULL,NULL,'none',2,4,NULL,'user',0),(73,50.00,NULL,NULL,NULL,NULL,'none',2,5,NULL,'user',0),(74,50.00,NULL,NULL,NULL,NULL,'none',2,56,NULL,'user',0),(75,50.00,NULL,NULL,NULL,NULL,'none',2,18,NULL,'user',0);
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
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_schedule`
--

LOCK TABLES `delivery_schedule` WRITE;
/*!40000 ALTER TABLE `delivery_schedule` DISABLE KEYS */;
INSERT INTO `delivery_schedule` VALUES (1,'2026-09-28','delivered','2026-09-28',0,115,'/uploads/1790589109220-684018628.webp','Ok\n',1,NULL,1,0),(2,'2026-10-03','delivered','2026-09-28',0,118,NULL,'Delivered to customer directly',1,NULL,1,0),(3,'2026-10-08','pending',NULL,0,NULL,NULL,NULL,1,NULL,1,0),(4,'2026-10-13','pending',NULL,0,NULL,NULL,NULL,1,NULL,1,0),(5,'2026-10-17','pending',NULL,0,NULL,NULL,NULL,1,NULL,1,0),(6,'2026-10-23','pending',NULL,0,NULL,NULL,NULL,1,NULL,1,0),(7,'2026-09-28','delivered','2026-09-28',0,115,NULL,'Delivered to customer directly',2,NULL,1,0),(8,'2026-10-01','pending',NULL,0,NULL,NULL,NULL,2,NULL,1,0),(9,'2026-10-05','pending',NULL,0,NULL,NULL,NULL,2,NULL,1,0),(10,'2026-10-08','pending',NULL,0,NULL,NULL,NULL,2,NULL,1,0),(11,'2026-10-10','pending',NULL,0,NULL,NULL,NULL,2,NULL,1,0),(12,'2026-10-15','pending',NULL,0,NULL,NULL,NULL,2,NULL,1,0),(13,'2026-10-17','pending',NULL,0,NULL,NULL,NULL,2,NULL,1,0),(14,'2026-10-21','pending',NULL,0,NULL,NULL,NULL,2,NULL,1,0),(15,'2026-10-24','pending',NULL,0,NULL,NULL,NULL,2,NULL,1,0),(16,'2026-09-28','delivered','2026-09-28',0,118,NULL,'Delivered to customer directly',3,NULL,1,0),(17,'2026-10-03','pending',NULL,0,NULL,NULL,NULL,3,NULL,1,0),(18,'2026-10-10','pending',NULL,0,NULL,NULL,NULL,3,NULL,1,0),(19,'2026-10-16','pending',NULL,0,NULL,NULL,NULL,3,NULL,1,0),(20,'2026-10-22','pending',NULL,0,NULL,NULL,NULL,3,NULL,1,0),(21,'2026-09-28','delivered','2026-09-28',0,115,NULL,'Delivered to customer directly',4,NULL,1,0),(22,'2026-10-03','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(23,'2026-10-10','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(24,'2026-10-16','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(25,'2026-10-22','pending',NULL,0,NULL,NULL,NULL,4,NULL,1,0),(31,'2028-06-10','pending',NULL,0,NULL,NULL,NULL,6,NULL,1,0),(32,'2028-06-16','pending',NULL,0,NULL,NULL,NULL,6,NULL,1,0),(33,'2028-06-21','pending',NULL,0,NULL,NULL,NULL,6,NULL,1,0),(34,'2028-06-26','pending',NULL,0,NULL,NULL,NULL,6,NULL,1,0),(35,'2028-07-01','pending',NULL,0,NULL,NULL,NULL,6,NULL,1,0),(36,'2028-07-06','pending',NULL,0,NULL,NULL,NULL,6,NULL,1,0),(37,'2026-09-29','pending',NULL,0,NULL,NULL,NULL,1,NULL,NULL,0),(38,'2026-09-29','pending',NULL,0,NULL,NULL,NULL,2,NULL,NULL,0),(39,'2026-09-29','pending',NULL,0,NULL,NULL,NULL,3,NULL,NULL,0),(40,'2026-09-29','pending',NULL,0,NULL,NULL,NULL,4,NULL,NULL,0);
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `missed_product_logs`
--

LOCK TABLES `missed_product_logs` WRITE;
/*!40000 ALTER TABLE `missed_product_logs` DISABLE KEYS */;
INSERT INTO `missed_product_logs` VALUES (1,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:02:25',105,1,'subscription',1,0),(2,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:02:25',105,3,'subscription',1,0),(3,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:02:25',105,4,'subscription',1,0),(4,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:02:55',110,1,'subscription',7,0),(5,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:02:55',110,2,'subscription',7,0),(6,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:02:56',110,4,'subscription',7,0),(7,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:02:56',110,16,'subscription',7,0),(8,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:02:56',110,18,'subscription',7,0),(9,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:03:26',111,18,'subscription',16,0),(10,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:03:52',112,1,'subscription',21,0),(11,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:03:52',112,2,'subscription',21,0),(12,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:03:52',112,3,'subscription',21,0),(13,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:03:52',112,4,'subscription',21,0),(14,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:03:52',112,5,'subscription',21,0),(15,'2026-09-28',0.00,'2026-09-29','2026-09-28 08:03:52',112,16,'subscription',21,0);
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
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_fixed_items`
--

LOCK TABLES `package_fixed_items` WRITE;
/*!40000 ALTER TABLE `package_fixed_items` DISABLE KEYS */;
INSERT INTO `package_fixed_items` VALUES (1,500.00,1,1),(2,500.00,1,2),(3,350.00,1,17),(4,200.00,1,16),(5,100.00,1,3),(6,100.00,1,4),(7,50.00,1,5),(8,50.00,1,56),(9,50.00,1,18),(10,250.00,2,1),(11,250.00,2,2),(12,150.00,2,17),(13,120.00,2,16),(14,60.00,2,3),(15,60.00,2,4),(16,50.00,2,5),(17,50.00,2,56),(18,50.00,2,18),(28,250.00,5,1),(29,250.00,5,2),(30,150.00,5,17),(31,120.00,5,16),(32,60.00,5,3),(33,60.00,5,4),(34,50.00,5,5),(35,50.00,5,56),(36,50.00,5,18),(37,500.00,4,1),(38,500.00,4,2),(39,350.00,4,17),(40,200.00,4,16),(41,100.00,4,3),(42,100.00,4,4),(43,50.00,4,5),(44,50.00,4,56),(45,50.00,4,18);
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_seasonal_config`
--

LOCK TABLES `package_seasonal_config` WRITE;
/*!40000 ALTER TABLE `package_seasonal_config` DISABLE KEYS */;
INSERT INTO `package_seasonal_config` VALUES (1,3,1,NULL,'[350, 450, 250]'),(2,2,2,NULL,'[350, 200]'),(3,3,3,NULL,'[250, 250, 250]'),(4,3,4,NULL,'[350, 450, 250]'),(5,2,5,NULL,'[350, 200]');
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
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_seasonal_pool`
--

LOCK TABLES `package_seasonal_pool` WRITE;
/*!40000 ALTER TABLE `package_seasonal_pool` DISABLE KEYS */;
INSERT INTO `package_seasonal_pool` VALUES (1,1,6),(2,1,10),(3,1,9),(4,1,8),(5,1,7),(6,1,11),(7,1,12),(8,1,14),(9,1,15),(10,1,21),(11,1,22),(12,1,23),(13,1,25),(14,1,30),(15,1,29),(16,1,28),(17,1,27),(18,1,26),(19,1,31),(20,1,34),(21,1,35),(22,1,40),(23,1,39),(24,1,44),(25,1,45),(26,1,43),(27,1,37),(28,1,41),(29,1,46),(30,1,47),(31,1,54),(32,1,55),(33,1,57),(34,1,58),(35,1,60),(36,1,70),(37,2,6),(38,2,10),(39,2,9),(40,2,8),(41,2,7),(42,2,11),(43,2,12),(44,2,14),(45,2,15),(46,2,21),(47,2,22),(48,2,23),(49,2,25),(50,2,30),(51,2,29),(52,2,28),(53,2,27),(54,2,26),(55,2,31),(56,2,34),(57,2,35),(58,2,40),(59,2,39),(60,2,44),(61,2,45),(62,2,43),(63,2,37),(64,2,41),(65,2,46),(66,2,47),(67,2,54),(68,2,55),(69,2,57),(70,2,58),(71,2,60),(72,2,70),(109,5,6),(110,5,10),(111,5,9),(112,5,8),(113,5,7),(114,5,11),(115,5,12),(116,5,14),(117,5,15),(118,5,21),(119,5,22),(120,5,23),(121,5,25),(122,5,30),(123,5,29),(124,5,28),(125,5,27),(126,5,26),(127,5,31),(128,5,34),(129,5,35),(130,5,40),(131,5,39),(132,5,44),(133,5,45),(134,5,43),(135,5,37),(136,5,41),(137,5,46),(138,5,47),(139,5,54),(140,5,55),(141,5,57),(142,5,58),(143,5,60),(144,5,70),(145,4,6),(146,4,10),(147,4,9),(148,4,8),(149,4,7),(150,4,11),(151,4,12),(152,4,14),(153,4,15),(154,4,21),(155,4,22),(156,4,23),(157,4,25),(158,4,30),(159,4,29),(160,4,28),(161,4,27),(162,4,26),(163,4,31),(164,4,34),(165,4,35),(166,4,40),(167,4,39),(168,4,44),(169,4,45),(170,4,43),(171,4,37),(172,4,41),(173,4,46),(174,4,47),(175,4,54),(176,4,55),(177,4,57),(178,4,58),(179,4,60),(180,4,70);
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `packages`
--

LOCK TABLES `packages` WRITE;
/*!40000 ALTER TABLE `packages` DISABLE KEYS */;
INSERT INTO `packages` VALUES (1,'NANO',2,6,1499.00,'standard',NULL,99.87,'active','2026-09-27 12:16:40',NULL,NULL,'/uploads/1790511399961-172155934.png','draft_price_calculator'),(2,'SENIORS',1,5,749.00,'standard',NULL,100.00,'active','2026-09-27 12:18:10',NULL,NULL,'/uploads/1790511490070-878953635.png','draft_price_calculator'),(3,'SENIORS-H (HOME DELIVERY)',2,12,1200.00,'standard',NULL,0.00,'inactive','2026-09-27 12:21:26',NULL,NULL,'/uploads/1790511686721-403256972.png','manual'),(4,'NANO PLAN MR S.S.SAXENA',2,9,1500.00,'custom',110,33.33,'active','2026-09-27 12:22:40',NULL,'9669098509',NULL,'draft_price_calculator'),(5,'SENIORS-H (HOME DELIVERY)',1,5,899.00,'standard',NULL,140.05,'active','2026-09-27 12:26:24',NULL,NULL,'/uploads/1790511983825-848965212.png','draft_price_calculator');
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
  `payment_method` enum('wallet','razorpay','phonepe','admin_assigned') DEFAULT NULL,
  `gateway_txn_id` varchar(100) DEFAULT NULL,
  `status` enum('success','failed','pending') DEFAULT NULL,
  `type` enum('package_purchase','recharge','extra_item','yearly_booking') DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
INSERT INTO `payment_transactions` VALUES (1,1499.00,'phonepe','PKG_1_monthly_1_1_1790513194865','success','package_purchase','2026-09-27 12:46:34',105),(2,1500.00,'phonepe','PKG_4_monthly_2_1_1790513551388','success','package_purchase','2026-09-27 12:52:31',110),(3,899.00,'phonepe','PKG_5_monthly_3_1_1790513764696','success','package_purchase','2026-09-27 12:56:04',111),(4,899.00,'phonepe','PKG_5_monthly_4_1_1790513933501','success','package_purchase','2026-09-27 12:58:53',112),(5,57.00,'phonepe','RTL_1_1790519467210','success','extra_item','2026-09-27 14:31:07',111),(6,220.00,'phonepe','RTL_2_1790520813114','success','extra_item','2026-09-27 14:53:33',113),(7,97.50,'phonepe','RTL_3_1790522221045','success','extra_item','2026-09-27 15:17:01',113),(8,50.00,'phonepe','RTL_4_1790522291303','success','extra_item','2026-09-27 15:18:11',113),(9,1499.00,'admin_assigned',NULL,'success','package_purchase','2026-09-27 17:30:27',104),(10,45.00,'phonepe','RTL_5_1790599574336','success','extra_item','2026-09-28 12:46:14',113);
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_batches`
--

LOCK TABLES `production_batches` WRITE;
/*!40000 ALTER TABLE `production_batches` DISABLE KEYS */;
INSERT INTO `production_batches` VALUES (1,1,'2026-09-28',2.160,2.160,'pending','2026-09-28 04:49:33','2026-09-28 04:49:33'),(2,2,'2026-09-28',3.050,3.050,'pending','2026-09-28 04:50:05','2026-09-28 04:50:05'),(3,3,'2026-09-28',0.500,0.500,'pending','2026-09-28 04:51:57','2026-09-28 04:51:57'),(4,4,'2026-09-28',0.500,0.500,'pending','2026-09-28 04:54:37','2026-09-28 04:54:37'),(5,5,'2026-09-28',0.520,0.520,'pending','2026-09-28 04:55:09','2026-09-28 04:55:09'),(6,8,'2026-09-28',0.500,0.500,'pending','2026-09-28 04:55:37','2026-09-28 04:55:37'),(7,12,'2026-09-28',0.500,0.500,'pending','2026-09-28 04:55:57','2026-09-28 04:55:57'),(8,16,'2026-09-28',1.020,1.020,'pending','2026-09-28 04:57:50','2026-09-28 04:57:50'),(9,17,'2026-09-28',3.000,3.000,'pending','2026-09-28 04:58:04','2026-09-28 04:58:04'),(10,18,'2026-09-28',0.500,0.500,'pending','2026-09-28 04:58:38','2026-09-28 04:58:38'),(11,21,'2026-09-28',1.700,1.700,'pending','2026-09-28 05:00:36','2026-09-28 05:00:36'),(12,27,'2026-09-28',1.280,1.280,'pending','2026-09-28 05:01:22','2026-09-28 05:01:22'),(13,29,'2026-09-28',0.500,0.500,'pending','2026-09-28 05:02:57','2026-09-28 05:02:57'),(14,37,'2026-09-28',1.000,1.000,'pending','2026-09-28 05:03:11','2026-09-28 05:03:11'),(15,39,'2026-09-28',1.530,1.530,'pending','2026-09-28 05:03:30','2026-09-28 05:03:30'),(16,54,'2026-09-28',1.030,1.030,'pending','2026-09-28 05:04:01','2026-09-28 05:04:01'),(17,60,'2026-09-28',1.000,1.000,'pending','2026-09-28 05:04:16','2026-09-28 05:04:16'),(18,56,'2026-09-28',0.590,0.590,'pending','2026-09-28 05:04:35','2026-09-28 05:04:35'),(19,77,'2026-09-28',0.520,0.520,'pending','2026-09-28 05:05:27','2026-09-28 05:05:27');
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
  `category` varchar(255) DEFAULT NULL,
  `sub_category` varchar(255) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Potato','Vegetable','Roots',0.0150,0.0150,'gm','active','2026-09-27 11:12:21',2160.00,750.00,1410.00,'आलू (Aloo)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.30,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',30,NULL,12,0,3),(2,'Onion','Vegetable','Roots',0.0250,0.0250,'gm','active','2026-09-27 11:12:22',3050.00,1250.00,1800.00,'प्याज (Pyaz)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.30,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',30,0,12,0,3),(3,'Lemon','Vegetable','Fruit Vegetable',0.1000,0.1000,'gm','active','2026-09-27 11:12:22',500.00,260.00,240.00,'नींबू (Nimbu)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,30.00,100.00,0.00,500.00,0.00,0.00,1,0.75,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',6,0,30,0,3),(4,'Garlic','Vegetable','Roots',0.1000,0.1000,'gm','active','2026-09-27 11:12:22',500.00,160.00,340.00,'लहसुन (Lahsun)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,30.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_25G',0,21,5,5,0),(5,'Ginger','Vegetable','Roots',0.1000,0.1000,'gm','active','2026-09-27 11:12:22',520.00,250.00,270.00,'अदरक (Adrak)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,30.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_25G',0,120,5,5,0),(6,'Taro Root','Vegetable','Roots',0.0400,0.0400,'gm','active','2026-09-27 11:12:22',0.00,0.00,0.00,'अरबी (Arbi)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_25G',0,30,2,2,0),(7,'Yam','Vegetable','Roots',0.0500,0.0500,'gm','inactive','2026-09-27 11:12:22',0.00,0.00,0.00,'जिमीकंद (Jimikand)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_25G',0,3,5,2,0),(8,'Beetroot','Vegetable','Roots',0.0300,0.0300,'gm','active','2026-09-27 11:12:23',500.00,0.00,500.00,'चुकंदर (Chukandar)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',30,0,20,0,3),(9,'Radish','Vegetable','Roots',0.0250,0.0250,'gm','inactive','2026-09-27 11:12:23',0.00,0.00,0.00,'मूली (Mooli)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.40,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',18,0,16,0,3),(10,'Sweet Potato','Vegetable','Roots',0.0400,0.0400,'gm','inactive','2026-09-27 11:12:23',0.00,0.00,0.00,'शकरकंद (Shakarkand)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_25G',0,30,1,0,3),(11,'Turnip','Vegetable','Roots',0.0300,0.0300,'gm','inactive','2026-09-27 11:12:23',0.00,0.00,0.00,'शलजम (Shalgam)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.40,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',18,0,16,0,3),(12,'Carrot','Vegetable','Roots',0.0300,0.0300,'gm','active','2026-09-27 11:12:23',500.00,450.00,50.00,'गाजर (Gajar)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_PIECE',18,0,20,0,3),(13,'Ash Gourd','Vegetable','Gourd',0.0800,0.0800,'gm','inactive','2026-09-27 11:12:24',0.00,0.00,0.00,'पेठा (Petha)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_25G',0,3,1,0,3),(14,'Kathal (Jackfruit)','Vegetable','Fruit Vegetable',0.0500,0.0500,'gm','inactive','2026-09-27 11:12:24',0.00,0.00,0.00,'कटहल (Kathal)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,0,'PER_25G',0,0,5,0,0),(15,'Pumpkin','Vegetable','Gourd',0.0250,0.0250,'gm','active','2026-09-27 11:12:24',0.00,250.00,-250.00,'कद्दू (Kaddu)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_25G',0,5,0,5,0),(16,'Cucumber','Vegetable','Gourd',0.0300,0.0300,'gm','active','2026-09-27 11:12:24',1020.00,520.00,500.00,'खीरा (Kheera)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.25,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',3,0,20,0,3),(17,'Tomato','Vegetable','Fruit Vegetable',0.0400,0.0400,'gm','active','2026-09-27 11:12:24',3000.00,1850.00,1150.00,'टमाटर (Tamatar)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.30,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',3,0,0,0,3),(18,'Chillies Green','Vegetable','Fruit Vegetable',0.0800,0.0800,'gm','active','2026-09-27 11:12:24',500.00,150.00,350.00,'हरी मिर्च (Hari Mirch)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,50.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_25G',0,3,2,2,0),(19,'Lotus Stem','Exotic Vegetable','Roots',0.0600,0.0600,'gm','inactive','2026-09-27 11:13:06',0.00,0.00,0.00,'कमल ककड़ी (Kamal Kakdi)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_25G',0,15,2,5,0),(20,'Broccoli','Exotic Vegetable','Fruit Vegetable',0.2500,0.2500,'gm','active','2026-09-27 11:13:06',0.00,0.00,0.00,'ब्रोकली (Brokali)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.10,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',12,0,40,0,30),(21,'Cauliflower','Vegetable','Fruit Vegetable',0.0500,0.0500,'gm','active','2026-09-27 11:13:07',1700.00,1248.00,452.00,'फूलगोभी (Phool Gobhi)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,450.00,100.00,0.00,500.00,0.00,0.00,1,0.06,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',12,0,22,0,30),(22,'Brinjal Small','Vegetable','Fruit Vegetable',0.0300,0.0300,'gm','inactive','2026-09-27 11:13:07',0.00,0.00,0.00,'छोटा बैंगन (Chhota Baingan)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',6,0,0,0,3),(23,'Brinjal Big','Vegetable','Fruit Vegetable',0.0350,0.0350,'gm','inactive','2026-09-27 11:13:07',0.00,0.00,0.00,'बड़ा बैंगन (Bada Baingan)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,350.00,100.00,0.00,500.00,0.00,0.00,1,0.07,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',12,0,0,0,3),(24,'Zucchini','Exotic Vegetable','Gourd',0.2000,0.2000,'gm','inactive','2026-09-27 11:13:07',0.00,0.00,0.00,'तोरई जुकिनी (Zucchini)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.10,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',9,0,8,0,3),(25,'Apple Gourd','Vegetable','Gourd',0.0600,0.0600,'gm','active','2026-09-27 11:13:07',0.00,0.00,0.00,'टिंडा (Tinda)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.70,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',6,0,0,0,3),(26,'Bitter Gourd','Vegetable','Gourd',0.0500,0.0500,'gm','active','2026-09-27 11:13:07',0.00,0.00,0.00,'करेला (Karela)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',6,0,0,0,3),(27,'Bottle Gourd','Vegetable','Gourd',0.0300,0.0300,'gm','active','2026-09-27 11:13:08',1280.00,700.00,580.00,'लौकी (Lauki)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,350.00,100.00,0.00,500.00,0.00,0.00,1,0.07,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',6,0,0,0,3),(28,'Ivy Gourd','Vegetable','Gourd',0.0400,0.0400,'gm','active','2026-09-27 11:13:08',0.00,250.00,-250.00,'कुंदरू (Kundru)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_25G',0,3,2,2,0),(29,'Pointed Gourd','Vegetable','Gourd',0.0550,0.0550,'gm','active','2026-09-27 11:13:08',500.00,250.00,250.00,'परवल (Parwal)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_25G',0,3,2,2,0),(30,'Drumstick','Vegetable','Fruit Vegetable',0.1000,0.1000,'gm','active','2026-09-27 11:13:08',0.00,0.00,0.00,'सहजन (Sahjan)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_25G',0,3,0,2,0),(31,'Capsicum','Vegetable','Fruit Vegetable',0.0700,0.0700,'gm','active','2026-09-27 11:13:09',0.00,0.00,0.00,'शिमला मिर्च (Shimla Mirch)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',9,0,0,0,3),(32,'Yellow Bell Pepper','Exotic Vegetable','Fruit Vegetable',0.1800,0.1800,'gm','inactive','2026-09-27 11:13:09',0.00,0.00,0.00,'पीली शिमला मिर्च (Peeli Shimla Mirch)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',9,0,0,0,3),(33,'Red Bell Pepper','Exotic Vegetable','Fruit Vegetable',0.1800,0.1800,'gm','inactive','2026-09-27 11:13:09',0.00,0.00,0.00,'लाल शिमला मिर्च (Lal Shimla Mirch)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.50,0.00,0.00,0.00,5.00,1,0.00,0.00,30,360,'PER_PIECE',9,0,0,0,3),(34,'Raw Banana','Vegetable','Fruit Vegetable',0.0500,0.0500,'gm','inactive','2026-09-27 11:13:09',0.00,0.00,0.00,'कच्चा केला (Kaccha Kela)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_25G',0,1,0,2,0),(35,'Ridge Gourd','Vegetable','Gourd',0.0500,0.0500,'gm','inactive','2026-09-27 11:13:09',0.00,0.00,0.00,'तोरी (Tori)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.40,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_PIECE',6,0,0,0,3),(36,'Snake Gourd','Vegetable','Gourd',0.0600,0.0600,'gm','inactive','2026-09-27 11:13:10',0.00,0.00,0.00,'चिचिंडा (Chichinda)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.30,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_PIECE',9,0,0,0,3),(37,'Sponge Gourd','Vegetable','Gourd',0.0500,0.0500,'gm','active','2026-09-27 11:13:10',1000.00,500.00,500.00,'नेनुआ (Nenua)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.70,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_PIECE',6,0,0,0,3),(38,'Corn','Vegetable','Fruit Vegetable',0.0700,0.0700,'gm','inactive','2026-09-27 11:13:10',0.00,0.00,0.00,'भुट्टा (Bhutta)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.10,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_PIECE',12,0,4,0,3),(39,'Okra / Lady Finger','Vegetable','Fruit Vegetable',0.0500,0.0500,'gm','active','2026-09-27 11:13:10',1530.00,700.00,830.00,'भिंडी (Bhindi)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,3,2,2,0),(40,'Spring Onion','Exotic Vegetable','Leafy',0.0600,0.0600,'gm','inactive','2026-09-27 11:13:10',0.00,0.00,0.00,'हरा प्याज (Hara Pyaz)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,30,5,15,0),(41,'Spring Garlic','Exotic Vegetable','Leafy',0.0650,0.0650,'gm','inactive','2026-09-27 11:13:11',0.00,0.00,0.00,'हरा लहसुन (Hara Lahsun)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,30,5,15,0),(42,'Cluster Beans','Vegetable','Beans/Pods',0.1000,0.1000,'gm','inactive','2026-09-27 11:13:11',0.00,0.00,0.00,'ग्वार फली (Gwar Phali)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,3,2,2,0),(43,'Green Beans (Barbatti)','Vegetable','Beans/Pods',0.0500,0.0500,'gm','active','2026-09-27 11:13:11',0.00,0.00,0.00,'बरबट्टी (Barbatti)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,3,2,2,0),(44,'French Beans','Vegetable','Beans/Pods',0.1000,0.1000,'gm','inactive','2026-09-27 11:13:11',0.00,0.00,0.00,'फ्रेंच बीन्स (French Beans)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,3,2,2,0),(45,'Green Peas','Vegetable','Beans/Pods',0.0350,0.0350,'gm','inactive','2026-09-27 11:13:11',0.00,0.00,0.00,'मटर (Matar)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,3,2,2,0),(46,'Lima Beans','Vegetable','Beans/Pods',0.0350,0.0350,'gm','inactive','2026-09-27 11:13:11',0.00,0.00,0.00,'सेम (Sem)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,3,2,2,0),(47,'Cabbage','Vegetable','Leafy',0.0300,0.0300,'gm','active','2026-09-27 11:13:12',0.00,0.00,0.00,'पत्तागोभी (Patta Gobhi)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,100.00,0.00,500.00,0.00,0.00,1,0.06,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_PIECE',12,0,25,0,30),(48,'Mint','Vegetable','Leafy',0.1000,0.1000,'gm','inactive','2026-09-27 11:13:12',0.00,0.00,0.00,'पुदीना (Pudina)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,25.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_25G',0,30,5,60,0),(49,'Parsley','Exotic Vegetable','Leafy',0.4000,0.2000,'gm','active','2026-09-27 11:13:12',0.00,0.00,0.00,'अजमोद (Ajmod)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,50.00,50.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_25G',0,30,5,60,0),(50,'Celery','Exotic Vegetable','Leafy',0.2500,0.1250,'gm','active','2026-09-27 11:13:12',0.00,0.00,0.00,'सेलेरी (Celery)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,25.00,50.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_25G',0,30,5,60,0),(51,'Thyme','Exotic Vegetable','Leafy',0.4000,0.2000,'gm','active','2026-09-27 11:13:13',0.00,0.00,0.00,'थाइम (Thyme)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,25.00,50.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_25G',0,30,5,60,0),(52,'Sweet Neem Leaves','Vegetable','Leafy',0.2500,0.2500,'gm','active','2026-09-27 11:13:13',0.00,0.00,0.00,'करी पत्ता (Curry Patta)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,50.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_25G',0,30,5,60,0),(53,'Raw Papaya','Vegetable','Fruit Vegetable',0.0600,0.0600,'gm','inactive','2026-09-27 11:13:13',0.00,0.00,0.00,'कच्चा पपीता (Kaccha Papita)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,100.00,0.00,500.00,0.00,0.00,1,0.10,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_PIECE',6,0,0,0,2),(54,'Fenugreek','Vegetable','Leafy',0.0400,0.0400,'gm','active','2026-09-27 11:13:13',1030.00,0.00,1030.00,'मेथी (Methi)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,60,'PER_25G',0,60,5,60,0),(55,'Red Leafy Vegetable (Lal Bhaji)','Vegetable','Leafy',0.0300,0.0300,'gm','inactive','2026-09-27 11:13:13',0.00,0.00,0.00,'लाल भाजी (Lal Bhaji)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_25G',0,60,5,60,0),(56,'Coriander','Vegetable','Leafy',0.0700,0.0700,'gm','active','2026-09-27 11:13:13',590.00,300.00,290.00,'धनिया पत्ता (Dhaniya Patta)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,25.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',0,60,5,60,0),(57,'Mustard Leaves','Vegetable','Leafy',0.0500,0.0500,'gm','inactive','2026-09-27 11:13:14',0.00,0.00,0.00,'सरसों का साग (Sarson Ka Saag)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',0,60,5,60,0),(58,'Bathua Leaves','Vegetable','Leafy',0.0500,0.0500,'gm','inactive','2026-09-27 11:13:14',0.00,0.00,0.00,'बथुआ (Bathua)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',0,60,5,60,0),(59,'Lettuce','Exotic Vegetable','Leafy',0.3500,0.1750,'gm','active','2026-09-27 11:13:14',0.00,0.00,0.00,'सलाद पत्ता (Salad Patta)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,100.00,50.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',0,60,5,60,0),(60,'Spinach','Vegetable','Leafy',0.0500,0.0500,'gm','active','2026-09-27 11:13:14',1000.00,0.00,1000.00,'पालक (Palak)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',0,60,5,60,0),(61,'Iceberg Lettuce','Exotic Vegetable','Leafy',0.2000,0.1000,'gm','active','2026-09-27 11:13:14',0.00,0.00,0.00,'आइसबर्ग लेट्यूस (Iceberg Lettuce)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,100.00,50.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',0,60,5,60,0),(62,'Basil Herb','Exotic Vegetable','Leafy',0.4000,0.2000,'gm','active','2026-09-27 11:13:15',0.00,0.00,0.00,'तुलसी (Tulsi)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,50.00,50.00,0.00,500.00,0.00,0.00,0,1.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',0,60,200,60,0),(63,'Mushroom','Exotic Vegetable','Roots',0.0400,0.0400,'box','active','2026-09-27 11:13:15',0.00,0.00,0.00,'खुंब',NULL,0.00,0.00,0.00,0.00,0.00,NULL,2,1.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,0,'PER_25G',0,0,0,0,0),(64,'Colocasia Leaves','Vegetable','Leafy',0.0500,0.0500,'gm','inactive','2026-09-27 11:13:15',0.00,0.00,0.00,'अरबी पत्ता (ARABI PATTA)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,30,'PER_25G',0,10,0,0,30),(65,'CHERRY TOMATO','Exotic Vegetable','Fruit Vegetable',0.0400,0.0400,'box','active','2026-09-27 11:13:15',0.00,0.00,0.00,'चेरी टमाटर / छोटा टमाटर (Chhota Tamatar)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,2,1.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_25G',0,3,0,5,0),(66,'HYBRID TOMATO','Vegetable','Fruit Vegetable',0.0500,0.0500,'gm','inactive','2026-09-27 11:13:15',0.00,0.00,0.00,'हाइब्रिड टमाटर (Hybrid Tamatar) / संकर टमाटर (Sankar Tamatar)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,1,0.30,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_PIECE',3,0,0,0,3),(67,'PEELLED GARLIC','Vegetable','Roots',0.2000,0.2000,'gm','inactive','2026-09-27 11:13:16',0.00,0.00,0.00,'छीला हुआ लहसुन (Chheela Hua Lahsun)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,30.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,0,'PER_25G',0,21,5,5,0),(68,'BIG GARLIC','Vegetable','Roots',0.1500,0.1500,'gm','inactive','2026-09-27 11:13:16',0.00,0.00,0.00,'बड़ा लहसुन (Bada Lahsun)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,30.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,0,'PER_25G',0,21,5,5,0),(69,'RED CABBAGE','Exotic Vegetable','Leafy',0.2000,0.1000,'gm','active','2026-09-27 11:13:16',0.00,0.00,0.00,'लाल पत्ता गोभी (Laal Patta Gobhi) / लाल बंदगोभी (Laal Bandgobhi)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,50.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,0,'PER_25G',0,0,10,0,30),(70,'GAWAR PHALLI','Vegetable','Beans/Pods',0.1000,0.1000,'gm','inactive','2026-09-27 11:13:16',0.00,0.00,0.00,'ग्वार फली (Gwaar Phalli)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,300,'PER_25G',0,3,2,2,0),(71,'SHALLOT','Vegetable','Roots',0.0500,0.0500,'gm','inactive','2026-09-27 11:13:16',0.00,0.00,0.00,'सांभर प्याज़ (Sambar Pyaz) / छोटा प्याज़ (Chhota Pyaz)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,250.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,720,'PER_25G',0,60,1,5,0),(72,'SMALL CORN','Exotic Vegetable','Fruit Vegetable',0.0800,0.0800,'box','active','2026-09-27 11:13:17',0.00,0.00,0.00,'छोटा भुट्टा (Bhutta)',NULL,0.00,0.00,0.00,0.00,0.00,NULL,2,1.00,100.00,0.00,500.00,0.00,0.00,0,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,30,420,'PER_25G',0,3,0,0,5),(73,'Alkaline Health Water (Glass)','water','glass',15.0000,20.0000,'piece','active','2026-09-27 12:52:32',0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(74,'Alkaline Health Water (Plastic)','water','plastic',10.0000,15.0000,'piece','active','2026-09-27 12:52:32',0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(75,'Miracle Water (Glass)','water','glass',25.0000,30.0000,'piece','active','2026-09-27 12:52:32',0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(76,'Miracle Water (Plastic)','water','plastic',20.0000,25.0000,'piece','active','2026-09-27 12:52:32',0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,0.00,0.00,NULL,NULL,0.00,0.00,0.00,500.00,0.00,0.00,1,0.00,0.00,0.00,0.00,5.00,1,0.00,0.00,0,0,'PER_25G',NULL,NULL,0,0,0),(77,'PAPITA','FRUITS GEN','LOCAL',0.0500,0.0500,'gm','active','2026-09-27 15:10:14',520.00,0.00,520.00,'PAPITA',NULL,0.00,0.00,0.00,0.00,0.00,NULL,1,400.00,100.00,0.00,500.00,0.00,0.00,1,NULL,0.00,0.00,0.00,5.00,1,0.00,0.00,30,120,'PER_PIECE',10,NULL,0,10,10);
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_logs`
--

LOCK TABLES `purchase_logs` WRITE;
/*!40000 ALTER TABLE `purchase_logs` DISABLE KEYS */;
INSERT INTO `purchase_logs` VALUES (1,2160.00,11.11,0.00,24.00,'2026-09-28 04:49:33',1),(2,3050.00,34.43,0.00,105.00,'2026-09-28 04:50:05',2),(3,500.00,160.00,0.00,80.00,'2026-09-28 04:51:57',3),(4,500.00,120.00,0.00,60.00,'2026-09-28 04:54:37',4),(5,520.00,153.85,0.00,80.00,'2026-09-28 04:55:09',5),(6,500.00,30.00,0.00,15.00,'2026-09-28 04:55:37',8),(7,500.00,30.00,0.00,15.00,'2026-09-28 04:55:57',12),(8,1020.00,34.31,0.00,35.00,'2026-09-28 04:57:50',16),(9,3000.00,30.00,0.00,90.00,'2026-09-28 04:58:04',17),(10,500.00,100.00,0.00,50.00,'2026-09-28 04:58:38',18),(11,1700.00,58.82,0.00,100.00,'2026-09-28 05:00:36',21),(12,1280.00,31.25,0.00,40.00,'2026-09-28 05:01:22',27),(13,500.00,50.00,0.00,25.00,'2026-09-28 05:02:57',29),(14,1000.00,60.00,0.00,60.00,'2026-09-28 05:03:11',37),(15,1530.00,39.22,0.00,60.00,'2026-09-28 05:03:30',39),(16,1030.00,38.83,0.00,40.00,'2026-09-28 05:04:01',54),(17,1000.00,50.00,0.00,50.00,'2026-09-28 05:04:16',60),(18,590.00,42.37,0.00,25.00,'2026-09-28 05:04:35',56),(19,520.00,115.38,0.00,60.00,'2026-09-28 05:05:27',77);
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `retail_order_items`
--

LOCK TABLES `retail_order_items` WRITE;
/*!40000 ALTER TABLE `retail_order_items` DISABLE KEYS */;
INSERT INTO `retail_order_items` VALUES (1,250.00,0.0300,7.50,1,12,250.00),(2,250.00,0.0300,7.50,1,8,250.00),(3,400.00,0.0300,12.00,1,47,400.00),(4,1000.00,0.0150,15.00,2,1,1000.00),(5,1000.00,0.0250,25.00,2,2,1000.00),(6,250.00,0.1000,25.00,2,5,250.00),(7,250.00,0.1000,25.00,2,4,250.00),(8,1000.00,0.0400,40.00,2,17,1000.00),(9,500.00,0.0500,25.00,2,39,500.00),(10,500.00,0.0300,15.00,2,8,500.00),(11,250.00,0.0800,20.00,2,18,250.00),(12,750.00,0.0500,37.50,3,60,NULL),(13,750.00,0.0400,30.00,3,54,NULL),(14,400.00,0.0500,20.00,4,77,NULL),(15,1000.00,0.0150,15.00,5,1,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `retail_orders`
--

LOCK TABLES `retail_orders` WRITE;
/*!40000 ALTER TABLE `retail_orders` DISABLE KEYS */;
INSERT INTO `retail_orders` VALUES (1,57.00,30.00,'phonepe','success','2026-09-28','ready_for_delivery','RTL_1_1790519467210','2026-09-27 14:31:07','2026-09-28 08:05:07',111,3,1,118,NULL),(2,220.00,30.00,'phonepe','success','2026-09-28','ready_for_delivery','RTL_2_1790520813114','2026-09-27 14:53:32','2026-09-28 08:05:07',113,5,1,118,NULL),(3,97.50,30.00,'phonepe','success','2026-09-28','pending','RTL_3_1790522221045','2026-09-27 15:17:00','2026-09-28 02:16:40',113,6,1,NULL,NULL),(4,50.00,30.00,'phonepe','success','2026-09-28','pending','RTL_4_1790522291303','2026-09-27 15:18:11','2026-09-28 02:16:40',113,6,1,NULL,NULL),(5,45.00,30.00,'phonepe','success','2026-09-29','pending','RTL_5_1790599574336','2026-09-28 12:46:14','2026-09-28 12:46:17',113,6,NULL,NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=115 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_seasonal_selections`
--

LOCK TABLES `schedule_seasonal_selections` WRITE;
/*!40000 ALTER TABLE `schedule_seasonal_selections` DISABLE KEYS */;
INSERT INTO `schedule_seasonal_selections` VALUES (1,450.00,0,7,21),(2,350.00,0,7,27),(3,0.00,0,7,1),(4,0.00,0,7,2),(5,100.00,0,7,3),(6,0.00,0,7,4),(7,100.00,0,7,5),(8,0.00,0,7,16),(9,500.00,0,7,17),(10,0.00,0,7,18),(11,50.00,0,7,56),(24,250.00,0,16,15),(25,250.00,0,16,37),(26,250.00,0,16,39),(27,250.00,0,16,1),(28,250.00,0,16,2),(29,60.00,0,16,3),(30,60.00,0,16,4),(31,50.00,0,16,5),(32,120.00,0,16,16),(33,150.00,0,16,17),(34,0.00,0,16,18),(35,50.00,0,16,56),(36,200.00,0,21,12),(37,348.00,0,21,21),(38,350.00,0,21,27),(39,200.00,0,21,39),(40,0.00,0,21,1),(41,0.00,0,21,2),(42,0.00,0,21,3),(43,0.00,0,21,4),(44,0.00,0,21,5),(45,0.00,0,21,16),(46,500.00,0,21,17),(47,50.00,0,21,18),(48,100.00,0,21,56),(49,250.00,0,1,12),(50,450.00,0,1,21),(51,250.00,0,1,28),(52,250.00,0,1,29),(53,250.00,0,1,37),(54,250.00,0,1,39),(55,0.00,0,1,1),(56,500.00,0,1,2),(57,0.00,0,1,3),(58,0.00,0,1,4),(59,50.00,0,1,5),(60,200.00,0,1,16),(61,350.00,0,1,17),(62,50.00,0,1,18),(63,50.00,0,1,56),(94,250.00,0,39,15),(95,250.00,0,39,37),(96,250.00,0,39,39),(97,250.00,0,39,1),(98,250.00,0,39,2),(99,60.00,0,39,3),(100,60.00,0,39,4),(101,50.00,0,39,5),(102,120.00,0,39,16),(103,150.00,0,39,17),(104,0.00,0,39,18),(105,50.00,0,39,56),(106,250.00,0,19,1),(107,250.00,0,19,2),(108,60.00,0,19,3),(109,60.00,0,19,4),(110,50.00,0,19,5),(111,120.00,0,19,16),(112,150.00,0,19,17),(113,50.00,0,19,18),(114,50.00,0,19,56);
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sub_categories`
--

LOCK TABLES `sub_categories` WRITE;
/*!40000 ALTER TABLE `sub_categories` DISABLE KEYS */;
INSERT INTO `sub_categories` VALUES (1,'Roots',1,'Roots','active','2026-09-27 11:17:05','2026-09-27 11:17:05'),(2,'Fruit Vegetable',1,'Fruit Vegetable','active','2026-09-27 11:17:07','2026-09-27 11:17:07'),(3,'Gourd',1,'Gourd','active','2026-09-27 11:17:08','2026-09-27 11:17:08'),(4,'Roots',2,'Roots','active','2026-09-27 11:17:10','2026-09-27 11:17:10'),(5,'Fruit Vegetable',2,'Fruit Vegetable','active','2026-09-27 11:17:10','2026-09-27 11:17:10'),(6,'Gourd',2,'Gourd','active','2026-09-27 11:17:11','2026-09-27 11:17:11'),(7,'Leafy',2,'Leafy','active','2026-09-27 11:17:12','2026-09-27 11:17:12'),(8,'Beans/Pods',1,'Beans/Pods','active','2026-09-27 11:17:13','2026-09-27 11:17:13'),(9,'Leafy',1,'Leafy','active','2026-09-27 11:17:14','2026-09-27 11:17:14'),(10,'LOCAL',3,'','active','2026-09-27 15:04:31','2026-09-27 15:04:31'),(11,'IMPORTED',3,'','active','2026-09-27 15:04:48','2026-09-27 15:04:48'),(12,'LOCAL',4,'','active','2026-09-27 15:04:58','2026-09-27 15:04:58'),(13,'IMPORTED',4,'','active','2026-09-27 15:05:14','2026-09-27 15:05:14');
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
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_items`
--

LOCK TABLES `subscription_items` WRITE;
/*!40000 ALTER TABLE `subscription_items` DISABLE KEYS */;
INSERT INTO `subscription_items` VALUES (1,500.00,1,0,1,1,1),(2,500.00,1,0,1,1,2),(3,350.00,1,0,1,1,17),(4,200.00,1,0,1,1,16),(5,100.00,1,0,1,1,3),(6,100.00,1,0,1,1,4),(7,50.00,1,0,1,1,5),(8,50.00,1,0,1,1,56),(9,50.00,1,0,1,1,18),(10,500.00,1,0,1,2,1),(11,500.00,1,0,1,2,2),(12,350.00,1,0,1,2,17),(13,200.00,1,0,1,2,16),(14,100.00,1,0,1,2,3),(15,100.00,1,0,1,2,4),(16,50.00,1,0,1,2,5),(17,50.00,1,0,1,2,56),(18,50.00,1,0,1,2,18),(19,250.00,1,0,1,3,1),(20,250.00,1,0,1,3,2),(21,150.00,1,0,1,3,17),(22,120.00,1,0,1,3,16),(23,60.00,1,0,1,3,3),(24,60.00,1,0,1,3,4),(25,50.00,1,0,1,3,5),(26,50.00,1,0,1,3,56),(27,50.00,1,0,1,3,18),(28,250.00,1,0,1,4,1),(29,250.00,1,0,1,4,2),(30,150.00,1,0,1,4,17),(31,120.00,1,0,1,4,16),(32,60.00,1,0,1,4,3),(33,60.00,1,0,1,4,4),(34,50.00,1,0,1,4,5),(35,50.00,1,0,1,4,56),(36,50.00,1,0,1,4,18),(46,500.00,1,0,1,6,1),(47,500.00,1,0,1,6,2),(48,350.00,1,0,1,6,17),(49,200.00,1,0,1,6,16),(50,100.00,1,0,1,6,3),(51,100.00,1,0,1,6,4),(52,50.00,1,0,1,6,5),(53,50.00,1,0,1,6,56),(54,50.00,1,0,1,6,18);
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES (1,'2026-09-28','2026-10-27','active','monthly',NULL,2,6,1,'2026-09-27 12:46:35',105,1,1,1499.00,0,1,0),(2,'2026-09-28','2026-10-27','cancelled','monthly',NULL,1,9,2,'2026-09-27 12:52:32',110,4,1,1500.00,0,1,0),(3,'2026-09-28','2026-10-27','active','monthly',NULL,1,5,3,'2026-09-27 12:56:05',111,5,1,899.00,0,1,0),(4,'2026-09-28','2026-10-27','active','monthly',NULL,1,5,4,'2026-09-27 12:58:54',112,5,1,899.00,0,1,0),(6,'2028-06-11','2028-07-10','active','monthly',NULL,0,6,7,'2026-09-27 17:30:27',104,1,1,1499.00,0,1,0);
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
) ENGINE=InnoDB AUTO_INCREMENT=172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_worker_assignments`
--

LOCK TABLES `task_worker_assignments` WRITE;
/*!40000 ALTER TABLE `task_worker_assignments` DISABLE KEYS */;
INSERT INTO `task_worker_assignments` VALUES (156,172,104,'2026-09-28 17:28:50','2026-09-28 17:29:42','2026-09-28 17:28:50','2026-09-28 17:29:42'),(157,173,104,'2026-09-28 17:29:42','2026-09-28 17:47:18','2026-09-28 17:29:42','2026-09-28 17:47:18'),(158,174,104,'2026-09-28 17:32:23','2026-09-28 17:36:11','2026-09-28 17:32:23','2026-09-28 17:36:11'),(159,175,104,'2026-09-28 17:36:11','2026-09-28 17:38:03','2026-09-28 17:36:11','2026-09-28 17:38:03'),(160,176,104,'2026-09-28 17:36:42','2026-09-28 17:38:03','2026-09-28 17:36:42','2026-09-28 17:38:03'),(161,177,104,'2026-09-28 17:38:03','2026-09-28 17:39:11','2026-09-28 17:38:03','2026-09-28 17:39:11'),(162,176,104,'2026-09-28 17:38:57','2026-09-28 17:38:59','2026-09-28 17:38:57','2026-09-28 17:38:59'),(163,178,104,'2026-09-28 17:38:59','2026-09-28 17:49:16','2026-09-28 17:38:59','2026-09-28 17:49:16'),(164,179,104,'2026-09-28 17:39:11','2026-09-28 17:51:13','2026-09-28 17:39:11','2026-09-28 17:51:13'),(165,180,104,'2026-09-28 17:47:18','2026-09-28 17:49:16','2026-09-28 17:47:18','2026-09-28 17:49:16'),(166,181,104,'2026-09-28 17:49:16','2026-09-28 17:50:38','2026-09-28 17:49:16','2026-09-28 17:50:38'),(167,182,104,'2026-09-28 17:50:38','2026-09-28 17:50:47','2026-09-28 17:50:38','2026-09-28 17:50:47'),(168,180,104,'2026-09-28 17:51:14','2026-09-28 17:57:47','2026-09-28 17:51:14','2026-09-28 17:57:47'),(169,183,104,'2026-09-28 17:57:47','2026-09-28 17:58:07','2026-09-28 17:57:47','2026-09-28 17:58:07'),(170,184,104,'2026-09-28 17:58:08','2026-09-28 17:58:58','2026-09-28 17:58:08','2026-09-28 17:58:58'),(171,185,104,'2026-09-28 17:58:58',NULL,'2026-09-28 17:58:58','2026-09-28 17:58:58');
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `units`
--

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
INSERT INTO `units` VALUES (1,'gram','gm','active','2026-09-27 11:17:06','2026-09-27 11:22:20'),(2,'BOX','box','active','2026-09-27 11:17:16','2026-09-27 11:17:16');
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
  UNIQUE KEY `phone_2` (`phone`),
  UNIQUE KEY `phone_3` (`phone`),
  UNIQUE KEY `phone_4` (`phone`),
  UNIQUE KEY `phone_5` (`phone`),
  UNIQUE KEY `phone_6` (`phone`),
  UNIQUE KEY `phone_7` (`phone`),
  UNIQUE KEY `phone_8` (`phone`),
  UNIQUE KEY `phone_9` (`phone`),
  UNIQUE KEY `phone_10` (`phone`),
  UNIQUE KEY `phone_11` (`phone`),
  UNIQUE KEY `phone_12` (`phone`),
  UNIQUE KEY `phone_13` (`phone`),
  UNIQUE KEY `phone_14` (`phone`),
  UNIQUE KEY `phone_15` (`phone`),
  UNIQUE KEY `phone_16` (`phone`),
  UNIQUE KEY `phone_17` (`phone`),
  UNIQUE KEY `phone_18` (`phone`),
  UNIQUE KEY `phone_19` (`phone`),
  UNIQUE KEY `phone_20` (`phone`),
  UNIQUE KEY `phone_21` (`phone`),
  UNIQUE KEY `phone_22` (`phone`),
  UNIQUE KEY `phone_23` (`phone`),
  UNIQUE KEY `phone_24` (`phone`),
  UNIQUE KEY `phone_25` (`phone`),
  UNIQUE KEY `phone_26` (`phone`),
  UNIQUE KEY `phone_27` (`phone`),
  UNIQUE KEY `phone_28` (`phone`),
  UNIQUE KEY `phone_29` (`phone`),
  UNIQUE KEY `phone_30` (`phone`),
  UNIQUE KEY `phone_31` (`phone`),
  UNIQUE KEY `phone_32` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','9000000001','admin@freshbox.com','$2b$10$irOyaNZUngx5sRq1Ezrl2eJcSIJoMqxe2F3FAMG3cf5vmWJs.IXrS','Admin@123','admin',0.00,0.00,'active','2026-06-18 12:46:19','2026-06-18 12:46:19',NULL,NULL,1,0.00,NULL,NULL,NULL,NULL,NULL,0,NULL),(104,'Sammer','9407884443','ayush.com','$2b$10$wWbhDk2ByQ9IQnS2pekfuOQH7e9wG4GNZJxydoKLoialXYF1MGcyG','123456','delivery',0.00,0.00,'active','2026-09-27 11:38:56','2026-09-27 11:38:56',NULL,NULL,1,0.00,NULL,NULL,NULL,'[]',NULL,0,NULL),(105,'SMRITI PATLE','7987953075','','$2b$10$zHPJ0AqzYXfzJT.FeA.T5uFxnGdfgpjtxgu0qYozCyp4wtyQ0xlr2','123456','user',1302.75,0.00,'active','2026-09-27 12:28:26','2026-09-28 09:51:49',NULL,NULL,1,0.00,NULL,NULL,NULL,'[]',NULL,0,NULL),(110,'S S SAXENA','9669098509','sajumathew2023@gmail.com','$2b$10$LlMdDXzcXmoO8OGb9TKlVeC8Waeo.2nWwesRGbAP60PxyLb/QTpVG','123456','user',1423.50,0.00,'active','2026-09-27 12:32:20','2026-09-28 10:05:19',NULL,NULL,1,0.00,NULL,NULL,NULL,'[]',NULL,0,NULL),(111,'MUKTA SHRIVASTAVA','9425607019','sajumathew2022@gmail.com','$2b$10$MJaCiIoSSkguweIW491QG.7h0vtjyI6GALoV6o3kjWKLo53uI8JAW','123456','user',827.65,0.00,'active','2026-09-27 12:33:31','2026-09-28 10:23:19',NULL,NULL,1,0.00,NULL,NULL,NULL,'[]',NULL,0,NULL),(112,'HARSHA MUSALGAONKAR','8839128134','sajumathewmk@gmail.com','$2b$10$sYxzkz2Pvy3hq8i58WdxKO1G4v18/6cQ0JidamujhezXaO92Hdxe2','123456','user',824.10,0.00,'active','2026-09-27 12:35:31','2026-09-28 09:29:07',NULL,NULL,1,0.00,NULL,NULL,NULL,'[]',NULL,0,NULL),(113,'PRATIKSHA JAIN','9303136101','sajumathe@gmail.com','$2b$10$Z3zW0sj08kJTczHZ0hrRhuOd10ImywG2pTcpQ3eJL//8aeey4cxLa','12345678','user',0.00,0.00,'active','2026-09-27 14:40:51','2026-09-27 14:41:11',NULL,NULL,1,0.00,NULL,NULL,'female','[]',NULL,0,'9G5JV81Q7RSX'),(114,'SAWANT BANSAL','8982306871','sajumathew2023@gmail.com','$2b$10$jYbvI24DOWOvWZODQ736P.zUGlspIrNl4tZumAG7aYP7rlw0P5QKe','123456','delivery',0.00,0.00,'active','2026-09-28 04:29:59','2026-09-28 04:29:59',NULL,NULL,1,0.00,'[]',NULL,NULL,'[]',NULL,0,NULL),(115,'NITIN','8171857353','sajumathew2023@gmail.com','$2b$10$rUNFO9alJt24J4DyPfBAZukR0cyBU10LOZJhTIOz4b7dAOPlPZTI2','123456','delivery',0.00,0.00,'active','2026-09-28 04:32:03','2026-09-28 04:32:03',NULL,NULL,1,0.00,'[]',NULL,NULL,'[]',NULL,0,NULL),(116,'VISHAL  BANSAL','7770930762','sajumathew2023@gmail.com','$2b$10$wUSk5Du5NmSJHKpby1viJOITkCrXPZmGx8VYTD2NDbFfpmzigEzJy','123456','delivery',0.00,0.00,'active','2026-09-28 04:33:25','2026-09-28 04:33:25',NULL,NULL,1,0.00,'[]',NULL,NULL,'[]',NULL,0,NULL),(117,'MONIKA LEKHPANDEY','9893264394','sajumathew2023@gmail.com','$2b$10$OC6e3vBvZIQfr2StL7wvBucgAyGsaPaScsQ7ovSEU.ofziIPx7C.K','123456','delivery',0.00,0.00,'active','2026-09-28 04:36:31','2026-09-28 04:36:31',NULL,NULL,1,0.00,'[]',NULL,NULL,'[]',NULL,0,NULL),(118,'PIYUSH CHAWADA','9981073432','sajumathew2023@gmail.com','$2b$10$OZyInSFvtmvH3lZBwfSN9.Ulf2IoR/gntqMzGanrLLh7Jv/JW3bx.','1234567','delivery',0.00,0.00,'active','2026-09-28 04:53:32','2026-09-28 04:53:32',NULL,NULL,1,0.00,'[]',NULL,NULL,'[]',NULL,0,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
INSERT INTO `wallet_transactions` VALUES (1,1499.00,'credit','Monthly package purchase: NANO (PhonePe)',NULL,'2026-09-27 12:46:35',105,NULL),(2,1500.00,'credit','Monthly package purchase: NANO PLAN MR S.S.SAXENA (PhonePe)',NULL,'2026-09-27 12:52:32',110,NULL),(3,899.00,'credit','Monthly package purchase: SENIORS-H (HOME DELIVERY) (PhonePe)',NULL,'2026-09-27 12:56:05',111,NULL),(4,899.00,'credit','Monthly package purchase: SENIORS-H (HOME DELIVERY) (PhonePe)',NULL,'2026-09-27 12:58:54',112,NULL),(5,249.83,'debit','Delivery on 2026-10-03 â€” NANO',2,'2026-09-28 08:52:33',105,NULL),(6,177.33,'credit','Refund for unused package budget on 2026-10-03',2,'2026-09-28 08:52:35',105,NULL),(7,179.80,'debit','Delivery on 2026-09-28 â€” SENIORS-H (HOME DELIVERY)',21,'2026-09-28 09:29:07',112,NULL),(8,104.90,'credit','Refund for unused package budget on 2026-09-28',21,'2026-09-28 09:29:07',112,NULL),(9,249.83,'debit','Delivery on 2026-09-28 â€” NANO',1,'2026-09-28 09:51:49',105,NULL),(10,126.08,'credit','Refund for unused package budget on 2026-09-28',1,'2026-09-28 09:51:49',105,NULL),(11,166.67,'debit','Delivery on 2026-09-28 â€” NANO PLAN MR S.S.SAXENA',7,'2026-09-28 10:05:19',110,NULL),(12,90.17,'credit','Refund for unused package budget on 2026-09-28',7,'2026-09-28 10:05:19',110,NULL),(13,179.80,'debit','Delivery on 2026-09-28 â€” SENIORS-H (HOME DELIVERY)',16,'2026-09-28 10:23:16',111,NULL),(14,108.45,'credit','Refund for unused package budget on 2026-09-28',16,'2026-09-28 10:23:19',111,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `worker_attendances`
--

LOCK TABLES `worker_attendances` WRITE;
/*!40000 ALTER TABLE `worker_attendances` DISABLE KEYS */;
INSERT INTO `worker_attendances` VALUES (1,115,'2026-09-28','2026-09-28 04:36:47','inactive','2026-09-28 04:36:47','2026-09-28 04:36:47'),(2,118,'2026-09-28','2026-09-28 05:05:50','inactive','2026-09-28 05:05:50','2026-09-28 05:05:50'),(3,114,'2026-09-28','2026-09-28 05:06:24','inactive','2026-09-28 05:06:24','2026-09-28 05:06:24'),(4,116,'2026-09-28','2026-09-28 05:06:28','inactive','2026-09-28 05:06:28','2026-09-28 05:06:28'),(5,104,'2026-09-28','2026-09-28 08:48:53','inactive','2026-09-28 08:48:53','2026-09-28 08:48:53');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `zones`
--

LOCK TABLES `zones` WRITE;
/*!40000 ALTER TABLE `zones` DISABLE KEYS */;
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

-- Dump completed on 2026-09-28 23:55:53
