package storefront

import (
	"encoding/json"
	"strconv"
	"strings"
)

var defaultSortOptions = []string{"Featured", "Best selling", "Price, low to high"}

// policyKeys maps the cms_pages slug to the key the frontend reads.
var policyKeys = map[string]string{
	"return-exchange-policy": "returns",
	"terms-conditions":       "terms",
}

type categoryRow struct {
	ID          int64
	ParentID    *int64
	Slug        string
	Name        string
	MenuLabel   string
	Description string
}

type productRow struct {
	ID         int64
	CategoryID *int64
	Slug       string
	Title      string
	Price      float64
	CompareAt  float64
	Badge      string
	Color      string
	Theme      string
	About      string
	Fabric     string
	Shipping   string
}

type imageRow struct {
	ProductID int64
	URL       string
	Alt       string
}

// homeRow is one section joined with one of its products; ProductSlug is empty for a section with none.
type homeRow struct {
	SectionID   int64
	Title       string
	Path        string
	Layout      string
	ProductSlug string
}

type pageRow struct {
	Slug    string
	Title   string
	Content string
}

// snapshot is the raw database content, read in one consistent transaction.
type snapshot struct {
	Settings   map[string]string
	Categories []categoryRow
	Products   []productRow
	Images     []imageRow
	Home       []homeRow
	Pages      []pageRow
}

// assemble turns raw rows into the response. It does no I/O, so it can be tested directly.
// Rows arrive already ordered; assemble keeps that order.
func assemble(in snapshot) Bundle {
	categories, collections, collectionOf := buildCategories(in.Categories)

	images := map[int64][]ProductImage{}
	for _, row := range in.Images {
		images[row.ProductID] = append(images[row.ProductID], ProductImage{URL: row.URL, Alt: row.Alt})
	}

	products := make([]Product, 0, len(in.Products))
	productIDsByCategory := map[int64][]string{}
	for _, row := range in.Products {
		product := Product{
			ID:         row.Slug,
			Title:      row.Title,
			Price:      row.Price,
			CompareAt:  row.CompareAt,
			Badge:      row.Badge,
			Color:      row.Color,
			Theme:      row.Theme,
			Images:     images[row.ID],
			About:      row.About,
			Fabric:     row.Fabric,
			Shipping:   row.Shipping,
			Collection: ProductCollection{Label: "Collections", Path: "/"},
		}
		if product.Images == nil {
			product.Images = []ProductImage{}
		}
		if len(product.Images) > 0 {
			product.Image = product.Images[0].URL
		}
		if row.CategoryID != nil {
			if collection, ok := collectionOf[*row.CategoryID]; ok {
				product.Collection = collection
			}
			productIDsByCategory[*row.CategoryID] = append(productIDsByCategory[*row.CategoryID], row.Slug)
		}
		products = append(products, product)
	}

	for i := range collections {
		id, _ := strconv.ParseInt(collections[i].ID, 10, 64)
		collections[i].ProductIDs = productIDsByCategory[id]
		if collections[i].ProductIDs == nil {
			collections[i].ProductIDs = []string{}
		}
	}

	return Bundle{
		Settings:    settingsFrom(in.Settings),
		Content:     contentFrom(in.Settings),
		Categories:  categories,
		Collections: collections,
		Products:    products,
		Home:        homeFrom(in.Home),
		Policies:    policiesFrom(in.Pages),
	}
}

// buildCategories returns the menu tree, the browsable collections, and each leaf's product-facing label and path.
func buildCategories(rows []categoryRow) ([]Category, []Collection, map[int64]ProductCollection) {
	children := map[int64][]categoryRow{}
	var top []categoryRow
	for _, row := range rows {
		if row.ParentID == nil {
			top = append(top, row)
		} else {
			children[*row.ParentID] = append(children[*row.ParentID], row)
		}
	}

	tree := []Category{}
	collections := []Collection{}
	collectionOf := map[int64]ProductCollection{}

	for _, parent := range top {
		node := categoryNode(parent, "")
		kids := children[parent.ID]

		if len(kids) == 0 {
			node.Path = "/collections/" + parent.Slug
			collections = append(collections, collectionFor(parent, parent.Name, node.Path))
			collectionOf[parent.ID] = ProductCollection{Label: parent.Name, Path: node.Path}
			tree = append(tree, node)
			continue
		}

		for _, kid := range kids {
			child := categoryNode(kid, "/collections/"+parent.Slug+"/"+kid.Slug)
			node.Children = append(node.Children, child)
			collections = append(collections, collectionFor(kid, parent.Name, child.Path))
			collectionOf[kid.ID] = ProductCollection{Label: parent.Name, Path: child.Path}
		}
		tree = append(tree, node)
	}

	return tree, collections, collectionOf
}

func categoryNode(row categoryRow, path string) Category {
	label := row.MenuLabel
	if label == "" {
		label = row.Name
	}

	return Category{
		ID:          strconv.FormatInt(row.ID, 10),
		Slug:        row.Slug,
		Name:        row.Name,
		Label:       label,
		Description: row.Description,
		Path:        path,
	}
}

func collectionFor(row categoryRow, breadcrumb, path string) Collection {
	return Collection{
		ID:          strconv.FormatInt(row.ID, 10),
		Path:        path,
		Title:       row.Name,
		Breadcrumb:  breadcrumb,
		Description: row.Description,
		SortOptions: defaultSortOptions,
	}
}

func settingsFrom(values map[string]string) Settings {
	return Settings{
		StoreName:      values["store_name"],
		CurrencyCode:   values["currency_code"],
		SupportEmail:   values["support_email"],
		SupportPhone:   values["support_phone"],
		SupportAddress: values["support_address"],
		Announcement:   values["announcement"],
	}
}

// contentFrom reads the JSON content blocks. A block that is missing or malformed is left empty
// rather than failing the whole page.
func contentFrom(values map[string]string) Content {
	content := Content{
		SpotlightCards: []SpotlightCard{},
		Navigation:     []NavLink{},
		SocialLinks:    []SocialLink{},
		ProductPage:    ProductPage{TrustPoints: []string{}},
	}

	unmarshal(values["hero_content_json"], &content.Hero)
	unmarshal(values["spotlight_cards_json"], &content.SpotlightCards)
	unmarshal(values["navigation_json"], &content.Navigation)
	unmarshal(values["product_page_json"], &content.ProductPage)
	unmarshal(values["social_links_json"], &content.SocialLinks)

	for i := range content.Navigation {
		content.Navigation[i].Match = navMatch(content.Navigation[i].Path)
	}

	return content
}

func unmarshal(raw string, target any) {
	if raw == "" {
		return
	}

	_ = json.Unmarshal([]byte(raw), target)
}

// navMatch returns the prefix that keeps a header link active on every page of its section:
// "/collections/traditional/sarees" is active for anything under "/collections/traditional/".
func navMatch(path string) string {
	if strings.Count(path, "/") >= 3 {
		return path[:strings.LastIndex(path, "/")+1]
	}

	return path
}

func homeFrom(rows []homeRow) []HomeSection {
	sections := []HomeSection{}
	index := map[int64]int{}

	for _, row := range rows {
		position, seen := index[row.SectionID]
		if !seen {
			sections = append(sections, HomeSection{
				ID:         strconv.FormatInt(row.SectionID, 10),
				Title:      row.Title,
				Path:       row.Path,
				Layout:     row.Layout,
				ProductIDs: []string{},
			})
			position = len(sections) - 1
			index[row.SectionID] = position
		}

		if row.ProductSlug != "" {
			sections[position].ProductIDs = append(sections[position].ProductIDs, row.ProductSlug)
		}
	}

	return sections
}

func policiesFrom(pages []pageRow) map[string]Policy {
	policies := map[string]Policy{}

	for _, page := range pages {
		if key, ok := policyKeys[page.Slug]; ok {
			policies[key] = parsePolicy(page.Title, page.Content)
		}
	}

	return policies
}

// parsePolicy reads the plain-text policy format the admin edits. Blocks are separated by a blank
// line. In a block, "## Heading" is the heading, "- " lines are list items, and other lines are body text.
func parsePolicy(title, content string) Policy {
	policy := Policy{Title: title, Sections: []PolicySection{}}

	for _, block := range strings.Split(strings.ReplaceAll(content, "\r\n", "\n"), "\n\n") {
		var section PolicySection
		var body []string

		for _, line := range strings.Split(block, "\n") {
			line = strings.TrimSpace(line)

			switch {
			case line == "":
			case strings.HasPrefix(line, "## "):
				section.Heading = strings.TrimSpace(strings.TrimPrefix(line, "## "))
			case strings.HasPrefix(line, "- "):
				section.Items = append(section.Items, strings.TrimSpace(strings.TrimPrefix(line, "- ")))
			default:
				body = append(body, line)
			}
		}

		section.Body = strings.Join(body, " ")
		if section.Heading != "" || section.Body != "" || len(section.Items) > 0 {
			policy.Sections = append(policy.Sections, section)
		}
	}

	return policy
}
