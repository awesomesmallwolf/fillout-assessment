const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;
require('dotenv').config();
app.use(express.json());

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const fetchFilloutApiResponse = async (formId) => {
    try {
        const response = await axios.get(`${process.env.FILLOUT_API_BASE_URL}/forms/${formId}/submissions`, {
            headers: {
                Authorization: `Bearer ${process.env.FILLOUT_API_KEY}`
            }
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

const validateFilterCondition = (question, filter) => {
    switch (filter.condition) {
        case 'equals':
            return question.value === filter.value;
        case 'does_not_equal':
            return question.value !== filter.value;
        case 'greater_than':
            return !isNaN(Number(question.value)) && Number(question.value) > filter.value;
        case 'less_than':
            return !isNaN(Number(question.value)) && Number(question.value) < filter.value;
        default:
            return false;
    }
};

app.get('/:formId/filteredResponses', async (req, res, next) => {
    try {
        const { formId } = req.params;
        const { filters, limit } = req.query;

        const parsedFilters = JSON.parse(filters);
        
        const parsedLimit = parseInt(limit) || 150;

        const response = await fetchFilloutApiResponse(formId);

        const filteredResponses = response.responses.filter(response => {
            for (const filter of parsedFilters) {
                const question = response.questions.find(question => question.id === filter.id);
                if (!question || !validateFilterCondition(question, filter)) {
                    return false;
                }
            }
            return true;
        });

        const pageCount = Math.ceil(filteredResponses.length / parsedLimit);

        res.json({
            responses: filteredResponses.slice(0, parsedLimit),
            totalResponses: filteredResponses.length,
            pageCount: pageCount
        });
    } catch (error) {
        next(error);
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
