package com.xeno.minicrm.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * HMAC-SHA256 signature validation utility for webhook payloads.
 *
 * <p>Verifies that incoming webhook requests originate from our trusted
 * Node.js channel service by comparing the HMAC signature in the
 * {@code X-Hub-Signature-256} header against a locally computed hash
 * of the raw request body.</p>
 *
 * <p><strong>Security properties:</strong></p>
 * <ul>
 *   <li>Uses {@link MessageDigest#isEqual} for constant-time comparison,
 *       preventing timing side-channel attacks.</li>
 *   <li>Operates on the raw request body string to avoid hash mismatches
 *       caused by JSON re-serialization differences.</li>
 * </ul>
 */
@Component
@Slf4j
public class WebhookSecurityUtil {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SIGNATURE_PREFIX = "sha256=";

    /**
     * Validates an HMAC-SHA256 signature against the raw payload.
     *
     * @param payload         the raw request body string (exact bytes as received)
     * @param headerSignature the signature from the {@code X-Hub-Signature-256} header
     *                        (with or without the {@code sha256=} prefix)
     * @param secret          the shared secret used to compute the HMAC
     * @return {@code true} if the signature is valid, {@code false} otherwise
     */
    public boolean isValidSignature(String payload, String headerSignature, String secret) {
        if (payload == null || headerSignature == null || secret == null) {
            log.warn("HMAC validation failed — null input (payload={}, header={}, secret={})",
                    payload != null, headerSignature != null, secret != null);
            return false;
        }

        try {
            // --- Compute expected HMAC ---
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(keySpec);

            byte[] expectedHash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedHex = bytesToHex(expectedHash);

            // --- Strip "sha256=" prefix from the incoming header if present ---
            String receivedHex = headerSignature;
            if (receivedHex.startsWith(SIGNATURE_PREFIX)) {
                receivedHex = receivedHex.substring(SIGNATURE_PREFIX.length());
            }

            // --- Constant-time comparison to prevent timing attacks ---
            boolean valid = MessageDigest.isEqual(
                    expectedHex.getBytes(StandardCharsets.UTF_8),
                    receivedHex.getBytes(StandardCharsets.UTF_8)
            );

            if (!valid) {
                log.warn("HMAC signature mismatch — expected={}, received={}", expectedHex, receivedHex);
            }

            return valid;

        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("HMAC computation failed", e);
            return false;
        }
    }

    /**
     * Converts a byte array to a lowercase hexadecimal string.
     */
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
