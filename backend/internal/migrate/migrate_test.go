package migrate

import (
	"io/fs"
	"regexp"
	"sort"
	"testing"
)

// Migrations run in file name order and are recorded by name, so names must be
// unique, numbered from 000 with no gaps, and never reordered once applied.
func TestMigrationFilesAreNumberedInOrder(t *testing.T) {
	entries, err := fs.ReadDir(files, "sql")
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) == 0 {
		t.Fatal("expected at least one migration")
	}

	pattern := regexp.MustCompile(`^\d{3}_[a-z0-9_]+\.sql$`)
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !pattern.MatchString(entry.Name()) {
			t.Errorf("migration %q must be named NNN_description.sql", entry.Name())
		}
		names = append(names, entry.Name())
	}

	if !sort.StringsAreSorted(names) {
		t.Errorf("migrations are not listed in order: %v", names)
	}
	for i, name := range names {
		if want := fmtVersion(i); name[:3] != want {
			t.Errorf("migration %q: expected number %s (no gaps or duplicates)", name, want)
		}
	}
}

func fmtVersion(n int) string {
	return string([]byte{byte('0' + n/100%10), byte('0' + n/10%10), byte('0' + n%10)})
}
