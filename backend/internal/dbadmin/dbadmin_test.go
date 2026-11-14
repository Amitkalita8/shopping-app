package dbadmin

import (
	"testing"
	"time"
)

func TestIsSecretHidesCredentialColumns(t *testing.T) {
	for column, want := range map[string]bool{
		"password_hash":      true,
		"reset_token":        true,
		"razorpay_secret":    true,
		"otp_code":           true,
		"email":              false,
		"full_name":          false,
		"razorpay_order_id":  false,
		"razorpay_signature": false,
	} {
		if got := isSecret(column); got != want {
			t.Errorf("isSecret(%q) = %v, want %v", column, got, want)
		}
	}
}

func TestEscapeLikeMatchesLiterally(t *testing.T) {
	if got := escapeLike(`50%_off\`); got != `50\%\_off\\` {
		t.Fatalf("escapeLike = %q", got)
	}
}

func TestToText(t *testing.T) {
	when := time.Date(2026, 11, 14, 10, 30, 0, 0, time.UTC)
	for name, tc := range map[string]struct {
		in   any
		want string
	}{
		"string": {"hi", "hi"},
		"int":    {int64(42), "42"},
		"bool":   {true, "true"},
		"bytes":  {[]byte{0xde, 0xad}, `\xdead`},
		"time":   {when, "2026-11-14T10:30:00Z"},
		"uuid":   {[16]byte{0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 1, 2, 3, 4, 5, 6, 7, 8}, "12345678-9abc-def0-0102-030405060708"},
		"json":   {map[string]any{"a": 1.0}, `{"a":1}`},
	} {
		got := toText(tc.in)
		if got == nil || *got != tc.want {
			t.Errorf("%s: toText = %v, want %q", name, got, tc.want)
		}
	}
	if toText(nil) != nil {
		t.Error("toText(nil) should be nil so the page can show NULL")
	}
}
