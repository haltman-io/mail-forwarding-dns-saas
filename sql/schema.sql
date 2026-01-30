CREATE TABLE IF NOT EXISTS dns_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target VARCHAR(253) NOT NULL,
  type ENUM('UI', 'EMAIL') NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  activated_at DATETIME NULL,
  last_checked_at DATETIME NULL,
  next_check_at DATETIME NULL,
  last_check_result_json TEXT NULL,
  fail_reason TEXT NULL,
  expires_at DATETIME NOT NULL,
  UNIQUE KEY uniq_target_type (target, type),
  KEY idx_status (status),
  KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
