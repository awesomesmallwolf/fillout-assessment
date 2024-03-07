const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;
const FILLOUT_API_BASE_URL = 'https://api.fillout.com/v1/api';//process.env.FILLOUT_API_BASE_URL;
const FILLOUT_API_KEY = 'sk_prod_TfMbARhdgues5AuIosvvdAC9WsA5kXiZlW8HZPaRDlIbCpSpLsXBeZO7dCVZQwHAY3P4VSBPiiC33poZ1tdUj2ljOzdTCCOSpUZ_3912';//process.env.FILLOUT_API_KEY;

app.use(express.json());

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const fetchFilloutApiResponse = async (formId) => {
    try {
        const response = await axios.get(`${FILLOUT_API_BASE_URL}/forms/${formId}/submissions`, {
            headers: {
                Authorization: `Bearer ${FILLOUT_API_KEY}`
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
            responses: filteredResponses.slice(0, parsedLimit), // Apply limit to responses
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
