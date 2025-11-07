# Contributing to Bookmarketing.AI

Thank you for your interest in contributing to Bookmarketing.AI! We appreciate your support and welcome contributions from developers, designers, writers, and anyone passionate about helping authors succeed.

## How to Contribute

There are many ways you can contribute to this project, including but not limited to:

-   **Reporting bugs** — If you encounter any issues, please open an issue on GitHub with detailed information about the problem.
-   **Suggesting features** — Have an idea for a new feature? Open an issue and describe your suggestion.
-   **Improving documentation** — Help us make our documentation clearer and more comprehensive.
-   **Writing code** — Submit pull requests to fix bugs, add features, or improve performance.

## Getting Started

Before you start contributing, please take a moment to review our guidelines.

### Prerequisites

Make sure you have the following installed on your system:

-   **Node.js** (v18 or higher)
-   **npm** or **yarn**
-   **Git**

### Setting Up Your Development Environment

1.  **Fork the repository** on GitHub.

2.  **Clone your fork** to your local machine:

    ```bash
    git clone https://github.com/YOUR_USERNAME/Bookmarketing.AI.git
    cd Bookmarketing.AI
    ```

3.  **Install dependencies:**

    ```bash
    npm install
    ```

4.  **Create a `.env.local` file** in the root directory and add your Gemini API key:

    ```
    GEMINI_API_KEY=your_api_key_here
    ```

5.  **Run the development server:**

    ```bash
    npm run dev
    ```

    Your application should now be running at `http://localhost:3000`.

## Making Changes

### Branching Strategy

We follow a simple branching strategy:

-   **`main`** — The stable production branch
-   **Feature branches** — Create a new branch for each feature or bug fix

When creating a new branch, use a descriptive name:

```bash
git checkout -b feature/add-new-marketing-tool
git checkout -b fix/resolve-pdf-export-bug
```

### Code Style

Please follow these guidelines when writing code:

-   Use **TypeScript** for all new code
-   Follow the existing code style and conventions
-   Write clear, descriptive variable and function names
-   Add comments for complex logic
-   Keep functions small and focused on a single task

### Testing

Before submitting a pull request, make sure your code works as expected:

-   Test your changes locally
-   Ensure there are no console errors
-   Verify that existing functionality still works

### Committing Your Changes

Write clear, concise commit messages that describe what you changed and why:

```bash
git add .
git commit -m "Add new marketing tool for audience analysis"
```

### Submitting a Pull Request

1.  **Push your changes** to your fork:

    ```bash
    git push origin feature/add-new-marketing-tool
    ```

2.  **Open a pull request** on GitHub from your branch to the `main` branch of the original repository.

3.  **Provide a clear description** of your changes, including:
    -   What problem does this solve?
    -   What changes did you make?
    -   How can reviewers test your changes?

4.  **Wait for review** — A maintainer will review your pull request and provide feedback.

## Code of Conduct

Please note that this project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Questions?

If you have any questions or need help, feel free to:

-   Open an issue on GitHub
-   Join our community forum (coming soon!)
-   Reach out to the maintainers

Thank you for contributing to Bookmarketing.AI! Together, we can help authors reach one million readers.
