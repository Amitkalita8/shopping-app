package storefront

import (
	"reflect"
	"testing"
)

func ptr(v int64) *int64 { return &v }

func sampleSnapshot() snapshot {
	return snapshot{
		Settings: map[string]string{
			"store_name":        "Atelier",
			"navigation_json":   `[{"id":"n1","label":"Men","path":"/collections/mens/t-shirt"},{"id":"n2","label":"Accessories","path":"/collections/accessories"}]`,
			"hero_content_json": `{"title":"Hello","primaryPath":"/collections/traditional/sarees"}`,
			"product_page_json": `{"shippingNote":"Free","trustPoints":["a","b"]}`,
		},
		Categories: []categoryRow{
			{ID: 1, Slug: "mens", Name: "Men's collection"},
			{ID: 2, Slug: "traditional", Name: "Traditional"},
			{ID: 3, Slug: "accessories", Name: "Accessories", Description: "Bags"},
			{ID: 4, ParentID: ptr(1), Slug: "t-shirt", Name: "Men's T shirt", MenuLabel: "T shirt", Description: "Tees"},
			{ID: 5, ParentID: ptr(1), Slug: "shirt", Name: "Men's Shirt"},
			{ID: 6, ParentID: ptr(2), Slug: "sarees", Name: "Sarees"},
		},
		Products: []productRow{
			{ID: 10, CategoryID: ptr(5), Slug: "resort-shirt", Title: "Resort Shirt", Price: 1299},
			{ID: 11, CategoryID: ptr(5), Slug: "oxford-shirt", Title: "Oxford Shirt"},
			{ID: 12, CategoryID: ptr(6), Slug: "banarasi", Title: "Banarasi"},
			{ID: 13, CategoryID: ptr(3), Slug: "potli", Title: "Potli"},
			{ID: 14, Slug: "loose", Title: "Uncategorised"},
		},
		Images: []imageRow{
			{ProductID: 10, URL: "shirt.png", Alt: "Resort Shirt"},
			{ProductID: 10, URL: "shirt-2.png"},
		},
		Home: []homeRow{
			{SectionID: 1, Title: "Featured", Layout: "strip", ProductSlug: "banarasi"},
			{SectionID: 1, Title: "Featured", Layout: "strip", ProductSlug: "resort-shirt"},
			{SectionID: 2, Title: "Empty", Path: "/collections/mens/shirt", Layout: "grid"},
		},
		Pages: []pageRow{
			{Slug: "return-exchange-policy", Title: "Returns", Content: "## Rule\n- one\n- two"},
			{Slug: "unrelated", Title: "Ignored", Content: "x"},
		},
	}
}

func TestAssembleCategoryTree(t *testing.T) {
	bundle := assemble(sampleSnapshot())

	if len(bundle.Categories) != 3 {
		t.Fatalf("want 3 top-level categories, got %d", len(bundle.Categories))
	}

	men := bundle.Categories[0]
	if men.Path != "" || len(men.Children) != 2 {
		t.Fatalf("a group has children and no path, got path %q children %d", men.Path, len(men.Children))
	}
	if got := men.Children[0]; got.Label != "T shirt" || got.Path != "/collections/mens/t-shirt" {
		t.Errorf("child should use its menu label and full path, got %+v", got)
	}
	if got := men.Children[1]; got.Label != "Men's Shirt" {
		t.Errorf("child without a menu label falls back to its name, got %q", got.Label)
	}

	accessories := bundle.Categories[2]
	if accessories.Path != "/collections/accessories" || len(accessories.Children) != 0 {
		t.Errorf("a childless top-level category is a page itself, got %+v", accessories)
	}
}

func TestAssembleCollectionsAndProductPlacement(t *testing.T) {
	bundle := assemble(sampleSnapshot())

	wantPaths := []string{
		"/collections/mens/t-shirt",
		"/collections/mens/shirt",
		"/collections/traditional/sarees",
		"/collections/accessories",
	}
	var gotPaths []string
	for _, collection := range bundle.Collections {
		gotPaths = append(gotPaths, collection.Path)
	}
	if !reflect.DeepEqual(gotPaths, wantPaths) {
		t.Fatalf("collections = %v, want %v (groups themselves are not pages)", gotPaths, wantPaths)
	}

	shirts := bundle.Collections[1]
	if shirts.Title != "Men's Shirt" || shirts.Breadcrumb != "Men's collection" {
		t.Errorf("collection title/breadcrumb wrong: %+v", shirts)
	}
	if !reflect.DeepEqual(shirts.ProductIDs, []string{"resort-shirt", "oxford-shirt"}) {
		t.Errorf("collection must keep product order, got %v", shirts.ProductIDs)
	}
	if empty := bundle.Collections[0]; empty.ProductIDs == nil || len(empty.ProductIDs) != 0 {
		t.Errorf("empty collection should serialise as [], got %#v", empty.ProductIDs)
	}

	resort := bundle.Products[0]
	if resort.Collection.Label != "Men's collection" || resort.Collection.Path != "/collections/mens/shirt" {
		t.Errorf("product collection = %+v", resort.Collection)
	}
	if resort.Image != "shirt.png" || len(resort.Images) != 2 {
		t.Errorf("first image is the primary image, got %q of %d", resort.Image, len(resort.Images))
	}
	if potli := bundle.Products[3]; potli.Collection.Label != "Accessories" {
		t.Errorf("top-level product label = %q", potli.Collection.Label)
	}
	if loose := bundle.Products[4]; loose.Collection.Path != "/" || loose.Images == nil {
		t.Errorf("uncategorised product should point home with empty (non-nil) images, got %+v", loose)
	}
}

func TestAssembleContentAndHome(t *testing.T) {
	bundle := assemble(sampleSnapshot())

	if bundle.Settings.StoreName != "Atelier" {
		t.Errorf("store name = %q", bundle.Settings.StoreName)
	}
	if bundle.Content.Hero.PrimaryPath != "/collections/traditional/sarees" {
		t.Errorf("hero not loaded: %+v", bundle.Content.Hero)
	}
	if !reflect.DeepEqual(bundle.Content.ProductPage.TrustPoints, []string{"a", "b"}) {
		t.Errorf("product page copy not loaded: %+v", bundle.Content.ProductPage)
	}
	if bundle.Content.Navigation[0].Match != "/collections/mens/" || bundle.Content.Navigation[1].Match != "/collections/accessories" {
		t.Errorf("navigation match wrong: %+v", bundle.Content.Navigation)
	}

	if len(bundle.Home) != 2 {
		t.Fatalf("want 2 home sections, got %d", len(bundle.Home))
	}
	if !reflect.DeepEqual(bundle.Home[0].ProductIDs, []string{"banarasi", "resort-shirt"}) {
		t.Errorf("home section keeps product order, got %v", bundle.Home[0].ProductIDs)
	}
	if bundle.Home[1].ProductIDs == nil || len(bundle.Home[1].ProductIDs) != 0 {
		t.Errorf("a section without products should serialise as [], got %#v", bundle.Home[1].ProductIDs)
	}

	if _, ok := bundle.Policies["returns"]; !ok || len(bundle.Policies) != 1 {
		t.Errorf("only known policy pages are exposed, got %v", bundle.Policies)
	}
}

func TestAssembleToleratesMissingAndBrokenContent(t *testing.T) {
	bundle := assemble(snapshot{Settings: map[string]string{"navigation_json": "{not json"}})

	if bundle.Content.Navigation == nil || bundle.Content.SpotlightCards == nil || bundle.Content.SocialLinks == nil {
		t.Fatal("lists must be empty slices, never null, so the frontend can map over them")
	}
	if len(bundle.Content.Navigation) != 0 || len(bundle.Products) != 0 || len(bundle.Collections) != 0 {
		t.Fatalf("broken content should yield empty lists, got %+v", bundle.Content.Navigation)
	}
}

func TestNavMatch(t *testing.T) {
	for path, want := range map[string]string{
		"/collections/mens-collection/t-shirt": "/collections/mens-collection/",
		"/collections/traditional/sarees":      "/collections/traditional/",
		"/collections/accessories":             "/collections/accessories",
		"/":                                    "/",
	} {
		if got := navMatch(path); got != want {
			t.Errorf("navMatch(%q) = %q, want %q", path, got, want)
		}
	}
}

func TestParsePolicy(t *testing.T) {
	content := "Welcome to our website.\n\n## Refunds\n- Processed after inspection.\n- Credited in 7-10 days.\n\n" +
		"## Contact Us\nWrite to support\nwith your order details.\n\nThanks for reading."

	got := parsePolicy("Terms", content)

	want := Policy{
		Title: "Terms",
		Sections: []PolicySection{
			{Body: "Welcome to our website."},
			{Heading: "Refunds", Items: []string{"Processed after inspection.", "Credited in 7-10 days."}},
			{Heading: "Contact Us", Body: "Write to support with your order details."},
			{Body: "Thanks for reading."},
		},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("parsePolicy =\n%+v\nwant\n%+v", got, want)
	}

	if crlf := parsePolicy("T", "## A\r\n- x\r\n\r\n## B\r\ny"); len(crlf.Sections) != 2 {
		t.Errorf("Windows line endings from the admin textarea must still split into blocks, got %+v", crlf.Sections)
	}
	if empty := parsePolicy("T", ""); empty.Sections == nil || len(empty.Sections) != 0 {
		t.Errorf("empty content should give an empty (non-nil) section list, got %#v", empty.Sections)
	}
}
