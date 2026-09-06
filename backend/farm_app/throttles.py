from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthAnonRateThrottle(AnonRateThrottle):
    scope = "auth"


class AuthUserRateThrottle(UserRateThrottle):
    scope = "auth"


class AiRateThrottle(UserRateThrottle):
    scope = "ai"


class FeedbackAnonRateThrottle(AnonRateThrottle):
    scope = "feedback"


class FeedbackUserRateThrottle(UserRateThrottle):
    scope = "feedback"


class ScrapeAnonRateThrottle(AnonRateThrottle):
    scope = "scrape"


class ScrapeUserRateThrottle(UserRateThrottle):
    scope = "scrape"
