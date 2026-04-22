"""
Login urinishlarini bloklash (Account Lockout).
IP va email bo'yicha — ikkalasini ham tekshiradi.
"""
import time
from collections import deque
from threading import Lock
from typing import Tuple


class AccountLockoutManager:
    """
    Sliding window lockout:
      - 5 ta noto'g'ri urinishdan so'ng 15 daqiqaga bloklash
      - Key: email yoki IP
    """

    MAX_ATTEMPTS = 5
    WINDOW_SECONDS = 1800  # 30 daqiqa

    def __init__(self):
        self._hits: dict[str, deque] = {}
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> deque:
        """Eski urinishlarni tozalaydi va qolgan deque'ni qaytaradi."""
        hits = self._hits.get(key, deque())
        recent = deque(t for t in hits if now - t < self.WINDOW_SECONDS)
        self._hits[key] = recent
        return recent

    def record_failure(self, key: str) -> int:
        """Noto'g'ri urinishni qayd qiladi va qolgan urinishlar sonini qaytaradi."""
        now = time.monotonic()
        with self._lock:
            recent = self._prune(key, now)
            recent.append(now)
            remaining = self.MAX_ATTEMPTS - len(recent)
            return max(remaining, 0)

    def remaining_attempts(self, key: str) -> int:
        now = time.monotonic()
        with self._lock:
            recent = self._prune(key, now)
            return max(self.MAX_ATTEMPTS - len(recent), 0)

    def is_locked(self, key: str) -> Tuple[bool, int]:
        """(bloklangan?, qolgan_soniya)"""
        now = time.monotonic()
        with self._lock:
            recent = self._prune(key, now)
            if len(recent) >= self.MAX_ATTEMPTS:
                oldest = min(recent)
                retry_after = int(self.WINDOW_SECONDS - (now - oldest))
                return True, max(retry_after, 1)
            return False, 0

    def clear(self, key: str) -> None:
        """Muvaffaqiyatli logindan so'ng tozalash."""
        with self._lock:
            self._hits.pop(key, None)


# Global instance
lockout_manager = AccountLockoutManager()
