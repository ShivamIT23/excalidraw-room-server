<?php
/**
 * COLLABORATIVE WHITEBOARD - PHP ENTRY POINT
 * 
 * This is a simple PHP file that serves as the entry point for the application.
 * It includes the whiteboard.html file, allowing the application to be served
 * via a PHP server (e.g., `php -S localhost:8082`).
 * 
 * Purpose:
 * - Provides a .php extension for PHP server compatibility
 * - Includes the main HTML interface
 * - Can be extended to add server-side logic if needed
 * 
 * Usage:
 * - Start PHP server: php -S localhost:8082
 * - Access via: http://localhost:8082/index.php
 */

// Include the main whiteboard HTML interface
require_once("./index.html");
?>