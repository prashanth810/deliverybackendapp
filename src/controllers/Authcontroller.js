const signup = async (req, res) => {
    try { }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

const login = async (req, res) => {
    try { }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

export { signup, login };