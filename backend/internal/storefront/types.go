// Package storefront serves the public, read-only data the shop website renders from.
package storefront

// Bundle is everything the storefront needs to render, in one response.
type Bundle struct {
	Settings    Settings          `json:"settings"`
	Content     Content           `json:"content"`
	Categories  []Category        `json:"categories"`
	Collections []Collection      `json:"collections"`
	Products    []Product         `json:"products"`
	Home        []HomeSection     `json:"home"`
	Policies    map[string]Policy `json:"policies"`
}

type Settings struct {
	StoreName      string `json:"storeName"`
	CurrencyCode   string `json:"currencyCode"`
	SupportEmail   string `json:"supportEmail"`
	SupportPhone   string `json:"supportPhone"`
	SupportAddress string `json:"supportAddress"`
	Announcement   string `json:"announcement"`
}

type Content struct {
	Hero           Hero            `json:"hero"`
	SpotlightCards []SpotlightCard `json:"spotlightCards"`
	Navigation     []NavLink       `json:"navigation"`
	ProductPage    ProductPage     `json:"productPage"`
	SocialLinks    []SocialLink    `json:"socialLinks"`
}

type Hero struct {
	Eyebrow        string `json:"eyebrow"`
	Title          string `json:"title"`
	Copy           string `json:"copy"`
	PrimaryLabel   string `json:"primaryLabel"`
	PrimaryPath    string `json:"primaryPath"`
	SecondaryLabel string `json:"secondaryLabel"`
	SecondaryPath  string `json:"secondaryPath"`
}

type SpotlightCard struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Copy  string `json:"copy"`
}

// NavLink is a header link. Match is the path prefix that marks it as the active section.
type NavLink struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Path  string `json:"path"`
	Match string `json:"match"`
}

type ProductPage struct {
	ShippingNote string   `json:"shippingNote"`
	TrustPoints  []string `json:"trustPoints"`
	OfferTitle   string   `json:"offerTitle"`
	OfferCopy    string   `json:"offerCopy"`
}

type SocialLink struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	ShortLabel string `json:"shortLabel"`
	URL        string `json:"url"`
}

// Category is a node of the menu tree. Only pages that can be opened have a Path,
// so a group heading such as "Traditional" has Children and no Path.
type Category struct {
	ID          string     `json:"id"`
	Slug        string     `json:"slug"`
	Name        string     `json:"name"`
	Label       string     `json:"label"`
	Description string     `json:"description"`
	Path        string     `json:"path,omitempty"`
	Children    []Category `json:"children,omitempty"`
}

// Collection is one browsable page: a leaf category and the products in it.
type Collection struct {
	ID          string   `json:"id"`
	Path        string   `json:"path"`
	Title       string   `json:"title"`
	Breadcrumb  string   `json:"breadcrumb"`
	Description string   `json:"description"`
	SortOptions []string `json:"sortOptions"`
	ProductIDs  []string `json:"productIds"`
}

type Product struct {
	ID         string            `json:"id"`
	Title      string            `json:"title"`
	Price      float64           `json:"price"`
	CompareAt  float64           `json:"compareAt"`
	Badge      string            `json:"badge"`
	Color      string            `json:"color"`
	Theme      string            `json:"theme"`
	Image      string            `json:"image"`
	Images     []ProductImage    `json:"images"`
	About      string            `json:"about"`
	Fabric     string            `json:"fabric"`
	Shipping   string            `json:"shipping"`
	Collection ProductCollection `json:"collection"`
}

type ProductImage struct {
	URL string `json:"url"`
	Alt string `json:"alt"`
}

// ProductCollection is where a product lives: the top-level group's label and the page path to go back to.
type ProductCollection struct {
	Label string `json:"label"`
	Path  string `json:"path"`
}

// HomeSection is a block on the home page. Layout "strip" is the featured row, "grid" a titled section.
type HomeSection struct {
	ID         string   `json:"id"`
	Title      string   `json:"title"`
	Path       string   `json:"path"`
	Layout     string   `json:"layout"`
	ProductIDs []string `json:"productIds"`
}

type Policy struct {
	Title    string          `json:"title"`
	Sections []PolicySection `json:"sections"`
}

type PolicySection struct {
	Heading string   `json:"heading,omitempty"`
	Body    string   `json:"body,omitempty"`
	Items   []string `json:"items,omitempty"`
}
