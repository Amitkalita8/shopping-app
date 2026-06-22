package catalog

type Product struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Brand       string   `json:"brand"`
	Description string   `json:"description"`
	Price       int      `json:"price"`
	Currency    string   `json:"currency"`
	Sizes       []string `json:"sizes"`
	InStock     bool     `json:"in_stock"`
}

func MenTShirts() []Product {
	return []Product{
		{
			ID:          "men-ts-001",
			Name:        "Classic Crew Neck T-Shirt",
			Brand:       "Atelier PS Vogue",
			Description: "Soft everyday cotton T-shirt with a clean regular fit.",
			Price:       699,
			Currency:    "INR",
			Sizes:       []string{"S", "M", "L", "XL"},
			InStock:     true,
		},
		{
			ID:          "men-ts-002",
			Name:        "Relaxed Fit Graphic T-Shirt",
			Brand:       "Atelier PS Vogue",
			Description: "Relaxed streetwear-style T-shirt with a bold front print.",
			Price:       899,
			Currency:    "INR",
			Sizes:       []string{"M", "L", "XL"},
			InStock:     true,
		},
		{
			ID:          "men-ts-003",
			Name:        "Premium Pima Cotton T-Shirt",
			Brand:       "Atelier PS Vogue",
			Description: "Premium lightweight T-shirt made for cleaner dress-up looks.",
			Price:       1199,
			Currency:    "INR",
			Sizes:       []string{"S", "M", "L"},
			InStock:     false,
		},
	}
}
