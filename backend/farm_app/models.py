from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    Role_choices=(
        ("FARMER","Farmer"),
        ("EXPERT","Expert"),
    )
    user=models.OneToOneField(User,on_delete=models.CASCADE)
    mobile_number=models.CharField(max_length=11,unique=True)
    role=models.CharField(max_length=10,choices=Role_choices,default="FARMER")

    def __str__(self):
        return f"{self.user.username}-{self.role}"


class FarmProfile(models.Model):
    CROP_CHOICES = [
        ("rice", "水稻"),
        ("wheat", "小麦"),
        ("corn", "玉米"),
        ("soybean", "大豆"),
        ("vegetable", "蔬菜"),
        ("fruit", "果树"),
    ]
    GROWTH_STAGE_CHOICES = [
        ("seedling", "苗期"),
        ("vegetative", "分蘖/拔节期"),
        ("flowering", "孕穗/抽穗期"),
        ("grain_filling", "灌浆/成熟期"),
        ("harvest", "收获期"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="farm_profile")
    province = models.CharField(max_length=50)
    city = models.CharField(max_length=50, blank=True)
    main_crop = models.CharField(max_length=30, choices=CROP_CHOICES)
    growth_stage = models.CharField(max_length=30, choices=GROWTH_STAGE_CHOICES, default="seedling")
    planting_area = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}-{self.get_main_crop_display()}"


class FarmTask(models.Model):
    PRIORITY_CHOICES = [("high", "高"), ("medium", "中"), ("low", "低")]
    TASK_TYPE_CHOICES = [
        ("pest", "病虫防控"),
        ("fertilizer", "水肥管理"),
        ("field", "田间管理"),
        ("harvest", "收获管理"),
    ]

    profile = models.ForeignKey(FarmProfile, on_delete=models.CASCADE, related_name="tasks")
    task_type = models.CharField(max_length=20, choices=TASK_TYPE_CHOICES)
    title = models.CharField(max_length=100)
    description = models.TextField()
    suggested_date = models.DateField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["suggested_date", "-created_at"]
        unique_together = ("profile", "suggested_date", "title")

    def __str__(self):
        return f"{self.title}({self.suggested_date})"


class AgriStore(models.Model):
    province = models.CharField(max_length=50)
    city = models.CharField(max_length=50, blank=True)
    name = models.CharField(max_length=150)
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["province", "city", "name"]

    def __str__(self):
        return self.name


class AgriProduct(models.Model):
    store = models.ForeignKey(AgriStore, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=[("pesticide", "农药"), ("fertilizer", "肥料"), ("tool", "器械")])
    active_ingredient = models.CharField(max_length=150, blank=True)
    spec = models.CharField(max_length=100, blank=True)
    stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=20, default="件")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_restricted = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["store__province", "store__name", "price"]

    def __str__(self):
        return f"{self.name}({self.store.name})"


class PestDiagnosis(models.Model):
    STATUS_CHOICES = [
        ("draft", "待确认"),
        ("pending_review", "转人工复核"),
        ("treated", "已防治"),
        ("followed_up", "已回访"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pest_diagnoses")
    crop = models.CharField(max_length=50)
    location = models.CharField(max_length=100)
    image = models.ImageField(upload_to="pest_diagnosis/", null=True, blank=True)
    symptom = models.TextField(blank=True)
    diagnosis = models.CharField(max_length=150)
    confidence = models.FloatField(default=0.0)
    severity = models.CharField(max_length=20, choices=[("mild", "轻度"), ("medium", "中度"), ("severe", "重度")], default="mild")
    treatment_plan = models.JSONField(default=list, blank=True)
    needs_human_review = models.BooleanField(default=False)
    review_reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.diagnosis}-{self.crop}"


class TreatmentFollowUp(models.Model):
    diagnosis = models.OneToOneField(PestDiagnosis, on_delete=models.CASCADE, related_name="follow_up")
    treatment_date = models.DateField()
    product_name = models.CharField(max_length=150)
    effect_score = models.PositiveSmallIntegerField()
    loss_avoided = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.diagnosis.diagnosis}回访"
