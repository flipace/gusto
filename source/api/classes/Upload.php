<?php
/**
 * Image Upload Handler for Gusto Chef
 */

namespace GustoChef;

use Exception;

class Upload {
    private $db;
    private $uploadDir;
    private $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private $maxSize = 5 * 1024 * 1024; // 5MB

    public function __construct() {
        $this->db = Database::getInstance();
        $this->uploadDir = __DIR__ . '/../uploads/';

        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }

    public function uploadImage(array $file, int $userId, string $type = 'gallery'): array {
        // Validate file
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new Exception('No file uploaded');
        }

        if ($file['size'] > $this->maxSize) {
            throw new Exception('File too large (max 5MB)');
        }

        $mimeType = mime_content_type($file['tmp_name']);
        if (!in_array($mimeType, $this->allowedTypes)) {
            throw new Exception('Invalid file type. Allowed: JPG, PNG, WebP, GIF');
        }

        // Generate unique filename
        $extension = $this->getExtension($mimeType);
        $filename = $type . '_' . $userId . '_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
        $filepath = $this->uploadDir . $filename;

        // Resize image if too large
        $this->resizeImage($file['tmp_name'], $filepath, 1200, 1200);

        // Generate thumbnail
        $thumbFilename = 'thumb_' . $filename;
        $thumbPath = $this->uploadDir . $thumbFilename;
        $this->resizeImage($file['tmp_name'], $thumbPath, 400, 400);

        $url = '/api/uploads/' . $filename;
        $thumbUrl = '/api/uploads/' . $thumbFilename;

        return [
            'url' => $url,
            'thumbnail_url' => $thumbUrl,
            'filename' => $filename,
            'size' => filesize($filepath),
            'type' => $mimeType
        ];
    }

    public function uploadAvatar(array $file, int $userId): string {
        $result = $this->uploadImage($file, $userId, 'avatar');

        // Update user avatar
        $this->db->execute(
            "UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [$result['url'], $userId]
        );

        return $result['url'];
    }

    public function uploadGalleryImage(array $file, int $userId, array $data = []): array {
        $chef = new Chef();
        $profile = $chef->getProfile($userId);

        if (!$profile) {
            throw new Exception('Chef profile not found');
        }

        $result = $this->uploadImage($file, $userId, 'gallery');

        $this->db->execute(
            "INSERT INTO chef_gallery (chef_id, image_url, caption, dish_name)
             VALUES (?, ?, ?, ?)",
            [
                $profile['id'],
                $result['url'],
                $data['caption'] ?? '',
                $data['dish_name'] ?? ''
            ]
        );

        return [
            'id' => $this->db->lastInsertId(),
            'url' => $result['url'],
            'thumbnail_url' => $result['thumbnail_url'],
            'caption' => $data['caption'] ?? '',
            'dish_name' => $data['dish_name'] ?? ''
        ];
    }

    public function deleteGalleryImage(int $imageId, int $userId): bool {
        $chef = new Chef();
        $profile = $chef->getProfile($userId);

        if (!$profile) {
            throw new Exception('Chef profile not found');
        }

        $images = $this->db->query(
            "SELECT * FROM chef_gallery WHERE id = ? AND chef_id = ?",
            [$imageId, $profile['id']]
        );

        if (empty($images)) {
            throw new Exception('Image not found');
        }

        $image = $images[0];

        // Delete file
        $filename = basename($image['image_url']);
        $filepath = $this->uploadDir . $filename;
        $thumbPath = $this->uploadDir . 'thumb_' . $filename;

        if (file_exists($filepath)) unlink($filepath);
        if (file_exists($thumbPath)) unlink($thumbPath);

        // Delete from DB
        return $this->db->execute(
            "DELETE FROM chef_gallery WHERE id = ?",
            [$imageId]
        );
    }

    private function resizeImage(string $source, string $destination, int $maxWidth, int $maxHeight): bool {
        list($width, $height, $type) = getimagesize($source);

        // Calculate new dimensions
        $ratio = min($maxWidth / $width, $maxHeight / $height);
        if ($ratio >= 1) {
            // Image is smaller than max, just copy
            return copy($source, $destination);
        }

        $newWidth = (int)($width * $ratio);
        $newHeight = (int)($height * $ratio);

        // Create image resource
        switch ($type) {
            case IMAGETYPE_JPEG:
                $srcImage = imagecreatefromjpeg($source);
                break;
            case IMAGETYPE_PNG:
                $srcImage = imagecreatefrompng($source);
                break;
            case IMAGETYPE_GIF:
                $srcImage = imagecreatefromgif($source);
                break;
            case IMAGETYPE_WEBP:
                $srcImage = imagecreatefromwebp($source);
                break;
            default:
                return copy($source, $destination);
        }

        $dstImage = imagecreatetruecolor($newWidth, $newHeight);

        // Preserve transparency for PNG/GIF
        if ($type == IMAGETYPE_PNG || $type == IMAGETYPE_GIF) {
            imagealphablending($dstImage, false);
            imagesavealpha($dstImage, true);
        }

        imagecopyresampled($dstImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        // Save
        switch ($type) {
            case IMAGETYPE_JPEG:
                imagejpeg($dstImage, $destination, 85);
                break;
            case IMAGETYPE_PNG:
                imagepng($dstImage, $destination, 8);
                break;
            case IMAGETYPE_GIF:
                imagegif($dstImage, $destination);
                break;
            case IMAGETYPE_WEBP:
                imagewebp($dstImage, $destination, 85);
                break;
        }

        imagedestroy($srcImage);
        imagedestroy($dstImage);

        return true;
    }

    private function getExtension(string $mimeType): string {
        return match($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            default => 'jpg'
        };
    }

    public function serveImage(string $filename): void {
        $filepath = $this->uploadDir . basename($filename);

        if (!file_exists($filepath)) {
            http_response_code(404);
            exit;
        }

        $mimeType = mime_content_type($filepath);
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($filepath));
        header('Cache-Control: public, max-age=31536000');
        readfile($filepath);
        exit;
    }
}
