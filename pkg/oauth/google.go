package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const googleUserInfoURL = "https://www.googleapis.com/oauth2/v3/userinfo"

// GoogleUserInfo is the subset of the Google UserInfo response we care about.
type GoogleUserInfo struct {
	Sub           string `json:"sub"`            // Unique stable Google user ID
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// GoogleProvider wraps an oauth2.Config and provides a UserInfo helper.
type GoogleProvider struct {
	Config *oauth2.Config
}

// NewGoogleProvider builds a GoogleProvider from environment variables.
func NewGoogleProvider(redirectURL string) *GoogleProvider {
	return &GoogleProvider{
		Config: &oauth2.Config{
			ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
			ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
			RedirectURL:  redirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		},
	}
}

// GetUserInfo exchanges the OAuth2 token for the authenticated user's profile.
func (p *GoogleProvider) GetUserInfo(ctx context.Context, token *oauth2.Token) (*GoogleUserInfo, error) {
	client := p.Config.Client(ctx, token)

	resp, err := client.Get(googleUserInfoURL)
	if err != nil {
		return nil, fmt.Errorf("fetching google user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google user info returned %d: %s", resp.StatusCode, body)
	}

	var info GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("decoding google user info: %w", err)
	}

	if info.Sub == "" {
		return nil, fmt.Errorf("google user info missing sub claim")
	}

	return &info, nil
}
